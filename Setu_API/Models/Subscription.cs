using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Setu.Api.Models
{
    public class SubscriptionPlan
    {
        public Guid Id { get; set; }
        
        [Required]
        public string Name { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        
        public decimal Price { get; set; }
        
        public string Validity { get; set; } = "Monthly"; // Monthly, Quarterly, Yearly
        
        public string FeaturesJson { get; set; } = "[]"; // JSON List of features
        
        // Limits
        public int MaxCompanies { get; set; }
        public int MaxProducts { get; set; }
        public int MaxUsers { get; set; }

        public string Status { get; set; } = "Active"; // Active, Inactive
    }

    [Table("Subscriptions")]
    public class Subscription
    {
        public Guid Id { get; set; }
        
        public Guid UserId { get; set; }
        public User? User { get; set; }
        
        public Guid PlanId { get; set; }
        public SubscriptionPlan? Plan { get; set; }
        
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        
        public string Status { get; set; } = "Pending"; // Active, Expired, Pending, Rejected
        
        public Guid? ApprovedBy { get; set; }
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        [NotMapped]
        public bool IsActive => Status == "Active" && EndDate > DateTime.UtcNow;
    }
}
