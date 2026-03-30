using System.ComponentModel.DataAnnotations;

using System.Text.Json.Serialization;

namespace Setu.Api.Models
{
    public enum BusinessType
    {
        PrivateLimited,
        PublicLimited,
        Proprietorship,
        Partnership,
        Ngo
    }

    public class Company
    {
        public Guid Id { get; set; }
        
        public Guid UserId { get; set; }
        [JsonIgnore]
        public User? User { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;
        
        public string Address { get; set; } = string.Empty;
        public string Country { get; set; } = string.Empty;
        public string Currency { get; set; } = string.Empty;
        public string CurrencySymbol { get; set; } = string.Empty;
        public string Contact { get; set; } = string.Empty;
        
        public BusinessType Type { get; set; }
        public string TaxId { get; set; } = string.Empty;
        public string? GstNumber { get; set; }
        public string LicenseNumber { get; set; } = string.Empty;
        public string BankAccount { get; set; } = string.Empty;
        public string? BankName { get; set; }
        public string? IfscCode { get; set; }
        public string? BranchName { get; set; }
        public string Industry { get; set; } = string.Empty;
        
        public int Employees { get; set; }
        public decimal Revenue { get; set; }
        public decimal Expenses { get; set; }
        
        public DateTime IncorporationDate { get; set; }
        public string? Website { get; set; }

        public ICollection<Product> Products { get; set; } = new List<Product>();
        public ICollection<Customer> Customers { get; set; } = new List<Customer>();
        public ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
    }
}
