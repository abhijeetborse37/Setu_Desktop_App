using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Setu.Api.Data;
using Setu.Api.Models;
using Setu.Api.Services;
using System.Security.Claims;

namespace Setu.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [Setu.Api.Filters.SubscriptionRequired]
    public class CompaniesController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ISubscriptionService _subscriptionService;

        public CompaniesController(ApplicationDbContext context, ISubscriptionService subscriptionService)
        {
            _context = context;
            _subscriptionService = subscriptionService;
        }

        private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        [HttpGet]
        public async Task<ActionResult<IEnumerable<Company>>> GetCompanies()
        {
            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var isAdmin = userRole == "Admin";

            // Admins see all companies; Customers see only their own
            if (isAdmin)
            {
                return await _context.Companies.ToListAsync();
            }
            else
            {
                return await _context.Companies
                    .Where(c => c.UserId == UserId)
                    .ToListAsync();
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<Company>> CreateCompany(Company company)
        {
            /*
            if (!await _subscriptionService.HasActiveSubscription(UserId))
            {
                return BadRequest("Active subscription required to create companies.");
            }

            if (!await _subscriptionService.CanCreateCompany(UserId))
            {
                return BadRequest("Company limit reached for your current plan.");
            }
            */

            company.Id = Guid.NewGuid();
            company.UserId = company.UserId != Guid.Empty ? company.UserId : UserId;
            company.IncorporationDate = DateTime.SpecifyKind(company.IncorporationDate, DateTimeKind.Utc);
            _context.Companies.Add(company);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }

            return CreatedAtAction(nameof(GetCompanies), null, company);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCompany(Guid id, Company company)
        {
            if (id != company.Id) return BadRequest();
            
            var existingCompany = await _context.Companies.FindAsync(id);
            if (existingCompany == null) return NotFound();

            var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
            var isAdmin = userRole == "Admin";

            // Only Admin can update any company; Customers can only update their own
            if (!isAdmin && existingCompany.UserId != UserId)
            {
                return Forbid("You can only edit your own company details.");
            }

            company.IncorporationDate = DateTime.SpecifyKind(company.IncorporationDate, DateTimeKind.Utc);
            _context.Entry(company).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!CompanyExists(id)) return NotFound();
                else throw;
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteCompany(Guid id)
        {
            var company = await _context.Companies.FindAsync(id);
            if (company == null) return NotFound();

            _context.Companies.Remove(company);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool CompanyExists(Guid id)
        {
            return _context.Companies.Any(e => e.Id == id);
        }
    }
}
