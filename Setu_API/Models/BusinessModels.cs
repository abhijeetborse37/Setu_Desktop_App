using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Setu.Api.Models
{
    public class Product
    {
        public Guid Id { get; set; }
        
        public Guid UserId { get; set; }
        
        public Guid CompanyId { get; set; }
        [JsonIgnore]
        public Company? Company { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;
        
        public string Description { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        
        public decimal Price { get; set; }
        public decimal? PurchasePrice { get; set; }
        public int Stock { get; set; }
        
        public string Supplier { get; set; } = string.Empty;
        public string Sku { get; set; } = string.Empty;
        public string? Image { get; set; }
        public int UnitPerPack { get; set; } = 1;
        public string? HsnCode { get; set; }
        
        public string? CustomAttributesJson { get; set; } // Store as JSON string in Postgres
    }

    public enum CustomerGroup
    {
        Regular,
        Vip,
        New
    }

    public class Customer
    {
        public Guid Id { get; set; }
        
        public Guid UserId { get; set; }
        
        public Guid CompanyId { get; set; }
        [JsonIgnore]
        public Company? Company { get; set; }

        [Required]
        public string Name { get; set; } = string.Empty;
        
        [EmailAddress]
        public string Email { get; set; } = string.Empty;
        
        public string Phone { get; set; } = string.Empty;
        public string Address { get; set; } = string.Empty;
        public string? GstPanId { get; set; }
        public string? LicenseNo { get; set; }
        
        public CustomerGroup Group { get; set; } = CustomerGroup.Regular;
        
        public decimal TotalSpent { get; set; }
    }

    public class Transaction
    {
        public Guid Id { get; set; }

        public Guid UserId { get; set; }

        public Guid CompanyId { get; set; }
        [JsonIgnore]
        public Company? Company { get; set; }

        public string Type { get; set; } = "SALE"; // PURCHASE or SALE

        public ICollection<TransactionItem> Items { get; set; } = new List<TransactionItem>();

        public decimal TotalAmount { get; set; }
        public decimal TotalTax { get; set; }
        public decimal CgstTotal { get; set; } = 0;
        public decimal SgstTotal { get; set; } = 0;
        public decimal RoundOff { get; set; } = 0;

        public DateTime Date { get; set; } = DateTime.UtcNow;
        public string EntityName { get; set; } = string.Empty;
        public string? EntityGstNumber { get; set; }
        public string InvoiceNumber { get; set; } = string.Empty;
    }

    public class TransactionItem
    {
        public Guid Id { get; set; }
        
        public Guid TransactionId { get; set; }
        [JsonIgnore]
        public Transaction? Transaction { get; set; }

        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public string? HsnCode { get; set; }
        
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TaxRate { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal TotalAmount { get; set; }
        
        // GST Fields
        public decimal CgstRate { get; set; } = 0;
        public decimal SgstRate { get; set; } = 0;
        public decimal CgstAmount { get; set; } = 0;
        public decimal SgstAmount { get; set; } = 0;
    }
}
