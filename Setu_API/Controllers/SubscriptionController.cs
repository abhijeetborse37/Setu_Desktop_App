using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Setu.Api.Models;
using Setu.Api.Services;

namespace Setu.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;

        public SubscriptionController(ISubscriptionService subscriptionService)
        {
            _subscriptionService = subscriptionService;
        }

        [HttpGet("plans")]
        [AllowAnonymous]
        public async Task<IActionResult> GetPlans()
        {
            var plans = await _subscriptionService.GetAllPlans();
            return Ok(plans);
        }

        [HttpGet("status")]
        public async Task<IActionResult> GetStatus()
        {
            var logPath = Path.Combine(Directory.GetCurrentDirectory(), "request_log.txt");
            System.IO.File.AppendAllText(logPath, $"{DateTime.Now}: GetStatus called\n");
            
            var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userIdString)) return Unauthorized("User ID not found");

            var userId = Guid.Parse(userIdString);
            var subscription = await _subscriptionService.GetUserSubscription(userId);
            
            if (subscription == null)
            {
                return Ok(new { status = "None" });
            }

            return Ok(new
            {
                subscription.Id,
                subscription.Status,
                subscription.StartDate,
                subscription.EndDate,
                PlanName = subscription.Plan?.Name,
                IsActive = subscription.IsActive
            });
        }

        [HttpPost("request")]
        public async Task<IActionResult> RequestSubscription([FromBody] RequestSubDto request)
        {
            var logPath = Path.Combine(Directory.GetCurrentDirectory(), "request_log.txt");
            try
            {
                System.IO.File.AppendAllText(logPath, $"{DateTime.Now}: Received request for plan {request.PlanId}\n");
                
                var userIdString = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userIdString)) return Unauthorized("User ID not found in token");
                
                var userId = Guid.Parse(userIdString);
                var subscription = await _subscriptionService.RequestSubscription(userId, request.PlanId);
                
                System.IO.File.AppendAllText(logPath, $"{DateTime.Now}: Success for user {userId}\n");
                return Ok(new { message = "Subscription request submitted", subscriptionId = subscription.Id });
            }
            catch (Exception ex)
            {
                System.IO.File.AppendAllText(logPath, $"{DateTime.Now}: Error: {ex.Message}\n{ex.StackTrace}\n");
                return StatusCode(500, new { 
                    message = "Failed to request subscription: " + ex.Message,
                    details = ex.InnerException?.Message 
                });
            }
        }
    }

    public record RequestSubDto(Guid PlanId);
}
