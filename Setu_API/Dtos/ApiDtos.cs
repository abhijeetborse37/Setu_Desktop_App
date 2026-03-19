using System.ComponentModel.DataAnnotations;
using Setu.Api.Models;

namespace Setu.Api.Dtos
{
    // Auth DTOs
    public record LoginDto(string Email, string Password);
    public record RegisterDto(string Name, string Email, string Password, string? ContactNo, string? Role);
    public record RequestOtpDto(string? Email, string? ContactNo);
    public record UpdateProfileDto(string? Email, string? ContactNo, string? NewName, string? NewPassword, string SimulatedOtp, string ProvidedOtp);
    public record SetTabsDto(string? AllowedTabsPattern);

    // Admin DTOs
    public record RoleDto(UserRole Role);
    public record ResetPasswordDto(string NewPassword);
    public record CreateSubscriptionDto(Guid UserId, Guid PlanId, DateTime? StartDate);
    public record RegisterCompanyDto(
        Guid UserId,
        string Name,
        string Address,
        string Country,
        string Currency,
        string CurrencySymbol,
        string Contact,
        BusinessType Type,
        string TaxId,
        string? GstNumber,
        string LicenseNumber,
        string BankAccount,
        string? BankName,
        string? IfscCode,
        string? BranchName,
        string Industry,
        int Employees,
        decimal Revenue,
        decimal Expenses,
        DateTime IncorporationDate,
        string? Website
    );

    // Business DTOs
    public record CreateProductDto(
        Guid CompanyId,
        string Name,
        string Description,
        string Category,
        decimal Price,
        decimal? PurchasePrice,
        int Stock,
        string Supplier,
        string Sku,
        string? Image,
        int UnitPerPack,
        string? HsnCode,
        string? CustomAttributesJson
    );

    public record UpdateProductDto(
        string Name,
        string Description,
        string Category,
        decimal Price,
        decimal? PurchasePrice,
        int Stock,
        string Supplier,
        string Sku,
        string? Image,
        int UnitPerPack,
        string? HsnCode,
        string? CustomAttributesJson
    );

    public record CreateCustomerDto(
        Guid CompanyId,
        string Name,
        string Email,
        string Phone,
        string Address,
        string? GstPanId,
        string? LicenseNo,
        CustomerGroup Group
    );

    public record UpdateCustomerDto(
        string Name,
        string Email,
        string Phone,
        string Address,
        string? GstPanId,
        string? LicenseNo,
        CustomerGroup Group
    );

    public record CreateTransactionDto(
        Guid CompanyId,
        string Type,
        decimal TotalAmount,
        decimal TotalTax,
        decimal CgstTotal,
        decimal SgstTotal,
        decimal RoundOff,
        DateTime Date,
        string EntityName,
        string? EntityGstNumber,
        string InvoiceNumber,
        List<CreateTransactionItemDto> Items
    );

    public record CreateTransactionItemDto(
        Guid ProductId,
        string ProductName,
        string? HsnCode,
        int Quantity,
        decimal UnitPrice,
        decimal TaxRate,
        decimal TaxAmount,
        decimal TotalAmount,
        decimal CgstRate,
        decimal SgstRate,
        decimal CgstAmount,
        decimal SgstAmount
    );

    // Pagination DTOs
    public record PaginatedResponse<T>(
        List<T> Items,
        int TotalCount,
        int PageNumber,
        int PageSize,
        bool HasNextPage,
        bool HasPreviousPage
    );

    public record PaginationQuery(
        int PageNumber = 1,
        int PageSize = 50
    );

    // Response DTOs
    public record ProductResponse(
        Guid Id,
        string Name,
        string Description,
        string Category,
        decimal Price,
        decimal? PurchasePrice,
        int Stock,
        string Supplier,
        string Sku,
        string? Image,
        Guid CompanyId,
        Guid UserId,
        string? HsnCode,
        int UnitPerPack
    );

    public record TransactionResponse(
        Guid Id,
        string Type,
        decimal TotalAmount,
        decimal TotalTax,
        decimal CgstTotal,
        decimal SgstTotal,
        decimal RoundOff,
        DateTime Date,
        string EntityName,
        string? EntityGstNumber,
        string InvoiceNumber,
        Guid CompanyId,
        List<TransactionItemResponse> Items
    );

    public record TransactionItemResponse(
        Guid Id,
        Guid ProductId,
        string ProductName,
        string? HsnCode,
        int Quantity,
        decimal UnitPrice,
        decimal TaxRate,
        decimal TaxAmount,
        decimal TotalAmount,
        decimal CgstRate,
        decimal SgstRate,
        decimal CgstAmount,
        decimal SgstAmount
    );
}