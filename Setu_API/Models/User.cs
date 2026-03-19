using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Setu.Api.Models
{
    public enum UserRole
    {
        Admin,
        Customer
    }

    public class User
    {
        public Guid Id { get; set; }
        
        [Required]
        public string Name { get; set; } = string.Empty;
        
        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        [Required]
        public string PasswordHash { get; set; } = string.Empty;
        
        public UserRole Role { get; set; } = UserRole.Customer;
        
        public string? Avatar { get; set; }
        public string? ContactNo { get; set; }
        
        public string? AllowedTabsPattern { get; set; } = "*";
        
        public bool IsActive { get; set; } = true;

        public Subscription? Subscription { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation properties
        public ICollection<Company> Companies { get; set; } = new List<Company>();
    }
}
