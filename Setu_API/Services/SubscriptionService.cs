using Microsoft.EntityFrameworkCore;
using Setu.Api.Data;
using Setu.Api.Models;

namespace Setu.Api.Services
{
    public interface ISubscriptionService
    {
        Task<bool> HasActiveSubscription(Guid userId);
        Task<SubscriptionPlan?> GetUserPlan(Guid userId);
        Task<Subscription?> GetUserSubscription(Guid userId);
        Task<bool> CanCreateCompany(Guid userId);
        Task<bool> CanCreateProduct(Guid userId, Guid companyId);
        Task<IEnumerable<SubscriptionPlan>> GetAllPlans();
        Task<Subscription> RequestSubscription(Guid userId, Guid planId);
        Task<bool> ApproveSubscription(Guid subscriptionId, Guid adminId);
        Task<bool> RejectSubscription(Guid subscriptionId, Guid adminId);
        Task<IEnumerable<Subscription>> GetPendingSubscriptions();
    }

    public class SubscriptionService : ISubscriptionService
    {
        private readonly ApplicationDbContext _context;

        public SubscriptionService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> HasActiveSubscription(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user?.Role == UserRole.Admin) return true;

            var subscription = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.UserId == userId && (s.Status == "Active" || s.Status == "Pending"));
            
            return subscription != null;
        }

        public async Task<SubscriptionPlan?> GetUserPlan(Guid userId)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user?.Role == UserRole.Admin)
            {
                // Admins have "Unlimited" plan
                return new SubscriptionPlan { Name = "Admin", MaxCompanies = 9999, MaxProducts = 9999, MaxUsers = 9999 };
            }

            var subscription = await _context.Subscriptions
                .Include(s => s.Plan)
                .FirstOrDefaultAsync(s => s.UserId == userId && (s.Status == "Active" || s.Status == "Pending"));

            return subscription?.Plan;
        }

        public async Task<Subscription?> GetUserSubscription(Guid userId)
        {
            return await _context.Subscriptions
                .Include(s => s.Plan)
                .FirstOrDefaultAsync(s => s.UserId == userId);
        }

        public async Task<bool> CanCreateCompany(Guid userId)
        {
            var plan = await GetUserPlan(userId);
            if (plan == null) return false;

            var companyCount = await _context.Companies.CountAsync(c => c.UserId == userId);
            return companyCount < plan.MaxCompanies;
        }

        public async Task<bool> CanCreateProduct(Guid userId, Guid companyId)
        {
            var plan = await GetUserPlan(userId);
            if (plan == null) return false;

            var productCount = await _context.Products.CountAsync(p => p.CompanyId == companyId);
            return productCount < plan.MaxProducts;
        }

        public async Task<IEnumerable<SubscriptionPlan>> GetAllPlans()
        {
            return await _context.SubscriptionPlans.Where(p => p.Status == "Active").ToListAsync();
        }

        public async Task<Subscription> RequestSubscription(Guid userId, Guid planId)
        {
            var existing = await _context.Subscriptions.FirstOrDefaultAsync(s => s.UserId == userId);
            if (existing != null)
            {
                existing.PlanId = planId;
                existing.Status = "Pending";
                existing.UpdatedAt = DateTime.UtcNow;
                _context.Subscriptions.Update(existing);
                await _context.SaveChangesAsync();
                return existing;
            }

            var subscription = new Subscription
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                PlanId = planId,
                Status = "Pending",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Subscriptions.Add(subscription);
            await _context.SaveChangesAsync();
            return subscription;
        }

        public async Task<bool> ApproveSubscription(Guid subscriptionId, Guid adminId)
        {
            var subscription = await _context.Subscriptions.Include(s => s.Plan).FirstOrDefaultAsync(x => x.Id == subscriptionId);
            if (subscription == null) return false;

            subscription.Status = "Active";
            subscription.StartDate = DateTime.UtcNow;
            
            // Calculate end date based on validity
            if (subscription.Plan != null)
            {
                subscription.EndDate = subscription.Plan.Validity switch
                {
                    "Monthly" => DateTime.UtcNow.AddMonths(1),
                    "Quarterly" => DateTime.UtcNow.AddMonths(3),
                    "Yearly" => DateTime.UtcNow.AddYears(1),
                    _ => DateTime.UtcNow.AddMonths(1)
                };
            }
            else
            {
                subscription.EndDate = DateTime.UtcNow.AddMonths(1);
            }

            subscription.ApprovedBy = adminId;
            subscription.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RejectSubscription(Guid subscriptionId, Guid adminId)
        {
            var subscription = await _context.Subscriptions.FindAsync(subscriptionId);
            if (subscription == null) return false;

            subscription.Status = "Rejected";
            subscription.ApprovedBy = adminId;
            subscription.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<Subscription>> GetPendingSubscriptions()
        {
            return await _context.Subscriptions
                .Include(s => s.User)
                .Include(s => s.Plan)
                .Where(s => s.Status == "Pending")
                .ToListAsync();
        }
    }
}
