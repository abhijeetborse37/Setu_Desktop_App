using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Setu.Api.Data;
using Setu.Api.Models;

namespace Setu.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthController(ApplicationDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto login)
        {
            try
            {
                var user = await _context.Users
                    .Include(u => u.Subscription)
                    .ThenInclude(s => s!.Plan)
                    .FirstOrDefaultAsync(u => u.Email == login.Email);

                if (user == null || !BCrypt.Net.BCrypt.Verify(login.Password, user.PasswordHash))
                {
                    return Unauthorized(new { message = "Invalid email or password" });
                }

                if (!user.IsActive)
                {
                    return BadRequest(new { message = "Your account has been deactivated. Please contact support." });
                }

                var token = GenerateJwtToken(user);

                var subscriptionStatus = user.Subscription?.Status ?? "None";
                var subscriptionEndDate = user.Subscription?.EndDate;
                var isSubscriptionActive = user.Subscription?.IsActive ?? false;

                // Warning if subscription expires soon (5 days)
                string? warningMessage = null;
                if (isSubscriptionActive && subscriptionEndDate.HasValue)
                {
                    var daysLeft = (subscriptionEndDate.Value - DateTime.UtcNow).TotalDays;
                    if (daysLeft > 0 && daysLeft <= 5)
                    {
                        warningMessage = $"Your subscription will expire in {Math.Ceiling(daysLeft)} days.";
                    }
                }

                return Ok(new
                {
                    Token = token,
                    User = new
                    {
                        user.Id,
                        user.Name,
                        user.Email,
                        user.Role,
                        user.ContactNo,
                        AllowedTabsPattern = user.AllowedTabsPattern ?? "*",
                        SubscriptionStatus = subscriptionStatus,
                        SubscriptionEndDate = subscriptionEndDate,
                        IsSubscriptionActive = isSubscriptionActive,
                        PlanName = user.Subscription?.Plan?.Name ?? "None",
                        WarningMessage = warningMessage
                    }
                });
            }
            catch (Exception ex)
            {
                // Return details about the error to help identify if it's a missing column/table
                return StatusCode(500, new { 
                    message = "Database Error: Please ensure you have executed the latest schema.sql. " + ex.Message,
                    details = ex.InnerException?.Message 
                });
            }
        }

        /// <summary>Admin-only: Create a new user and return one-time credentials</summary>
        [HttpPost("create-user")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateUser([FromBody] RegisterDto register)
        {
            if (await _context.Users.AnyAsync(u => u.Email == register.Email))
                return BadRequest(new { message = "Email already exists" });

            var userRole = UserRole.Customer;
            if (!string.IsNullOrEmpty(register.Role) && Enum.TryParse<UserRole>(register.Role, out var parsedRole))
                userRole = parsedRole;

            var user = new User
            {
                Id = Guid.NewGuid(),
                Name = register.Name,
                Email = register.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(register.Password),
                ContactNo = register.ContactNo,
                Role = userRole,
                AllowedTabsPattern = "*",
                IsActive = true
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(new {
                message = "User created successfully! Share the credentials with the user.",
                User = new {
                    user.Id,
                    user.Name,
                    user.Email,
                    user.ContactNo,
                    user.Role,
                    OneTimePassword = register.Password // Plain text for admin to share once
                }
            });
        }

        /// <summary>Admin-only: Update which tabs a customer is allowed to access</summary>
        [HttpPut("users/{id}/tabs")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> SetUserTabs(Guid id, [FromBody] SetTabsDto request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound(new { message = "User not found." });
            user.AllowedTabsPattern = request.AllowedTabsPattern ?? "*";
            await _context.SaveChangesAsync();
            return Ok(new { message = "Tab access updated.", allowedTabsPattern = user.AllowedTabsPattern });
        }

        [HttpPost("request-otp")]
        public async Task<IActionResult> RequestOtp([FromBody] RequestOtpDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email || (u.ContactNo != null && u.ContactNo == request.ContactNo));
            if (user == null) return NotFound(new { message = "User not found." });

            // Generate a random 6 digit OTP
            var otp = new Random().Next(100000, 999999).ToString();
            
            // In a real app, send via Email/SMS. For now, just return it so frontend can simulate.
            // Or store it in a cache/db. We'll simulate by returning it.
            return Ok(new { message = "OTP sent successfully to " + (request.Email ?? request.ContactNo), simulateOtp = otp });
        }

        [HttpPost("update-profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email || (u.ContactNo != null && u.ContactNo == request.ContactNo));
            if (user == null) return NotFound(new { message = "User not found." });

            // Verify OTP - in reality you'd verify against a stored OTP. Here we assume the frontend validated it for demo.
            if (request.SimulatedOtp != request.ProvidedOtp)
            {
                return BadRequest(new { message = "Invalid OTP." });
            }

            if (!string.IsNullOrEmpty(request.NewName))
                user.Name = request.NewName;

            if (!string.IsNullOrEmpty(request.NewPassword))
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            await _context.SaveChangesAsync();

            return Ok(new { message = "Profile updated successfully.", user = new { user.Id, user.Name, user.Email, user.ContactNo, user.Role } });
        }

        private string GenerateJwtToken(User user)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
                new Claim("SubscriptionStatus", user.Subscription?.Status ?? "None")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["Jwt:Key"]!));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddDays(Convert.ToDouble(_configuration["Jwt:ExpireDays"] ?? "7"));

            var token = new JwtSecurityToken(
                _configuration["Jwt:Issuer"],
                _configuration["Jwt:Audience"],
                claims,
                expires: expires,
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }

    public record LoginDto(string Email, string Password);
    public record RegisterDto(string Name, string Email, string Password, string? ContactNo, string? Role);
    public record RequestOtpDto(string? Email, string? ContactNo);
    public record UpdateProfileDto(string? Email, string? ContactNo, string? NewName, string? NewPassword, string SimulatedOtp, string ProvidedOtp);
    public record SetTabsDto(string? AllowedTabsPattern);
}
