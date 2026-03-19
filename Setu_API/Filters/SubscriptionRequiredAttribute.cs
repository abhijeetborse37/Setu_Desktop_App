using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Setu.Api.Models;
using Setu.Api.Services;
using System.Security.Claims;

namespace Setu.Api.Filters
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
    public class SubscriptionRequiredAttribute : Attribute, IAsyncActionFilter
    {
        public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            /*
            var user = context.HttpContext.User;
            if (user.Identity?.IsAuthenticated == true)
            {
                var role = user.FindFirstValue(ClaimTypes.Role);
                
                // Admins don't need a subscription check for their own actions
                if (role == UserRole.Admin.ToString())
                {
                    await next();
                    return;
                }

                var userId = Guid.Parse(user.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var subscriptionService = context.HttpContext.RequestServices.GetRequiredService<ISubscriptionService>();
                var subscription = await subscriptionService.GetUserSubscription(userId);

                if (subscription == null || (subscription.Status != "Active" && subscription.Status != "Pending"))
                {
                    string msg = subscription == null ? "No subscription found. Please select a plan." :
                                 "Your subscription is not active. Status: " + subscription.Status;

                    context.Result = new ObjectResult(new { message = msg, status = subscription?.Status ?? "None" })
                    {
                        StatusCode = 403
                    };
                    return;
                }
            }
            */

            await next();
        }
    }
}
