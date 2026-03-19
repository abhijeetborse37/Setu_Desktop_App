using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Setu.Api.Data;
using Setu.Api.Models;

namespace Setu.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [Setu.Api.Filters.SubscriptionRequired]
    public class DashboardController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public DashboardController(ApplicationDbContext context)
        {
            _context = context;
        }

        private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        /// <summary>
        /// Unified initialization endpoint - returns all data needed on login/app load
        /// Returns: Companies, Products with stock calculations, Customers, and Transactions for the active company
        /// This replaces 4 separate API calls with a single optimized call
        /// </summary>
        [HttpGet("init")]
        [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any)] // Cache for 5 minutes
        public async Task<IActionResult> GetDashboardInit()
        {
            try
            {
                var userRole = User.FindFirst(ClaimTypes.Role)?.Value;
                var isAdmin = userRole == "Admin";

                // Get companies efficiently
                var companiesQuery = _context.Companies.AsQueryable();
                if (!isAdmin)
                {
                    companiesQuery = companiesQuery.Where(c => c.UserId == UserId);
                }

                var companies = await companiesQuery
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.TaxId,
                        c.GstNumber,
                        c.Address,
                        c.Contact,
                        c.Website,
                        c.IncorporationDate,
                        c.BankName,
                        c.BankAccount,
                        c.IfscCode,
                        c.CurrencySymbol,
                        c.UserId
                    })
                    .ToListAsync();

                if (companies.Count == 0)
                {
                    return Ok(new
                    {
                        companies = new List<object>(),
                        products = new List<object>(),
                        customers = new List<object>(),
                        transactions = new List<object>(),
                        activeCompanyId = (string?)null
                    });
                }

                // Get all products with pre-calculated stock for all companies
                var companyIds = companies.Select(c => (Guid)c.Id).ToList();
                
                // Pre-fetch all transaction items grouped by product and type for efficient stock calculation
                var stockData = await _context.TransactionItems
                    .Include(ti => ti.Transaction)
                    .Where(ti => companyIds.Contains(ti.Transaction!.CompanyId))
                    .GroupBy(ti => new { ti.ProductId, Type = ti.Transaction!.Type })
                    .Select(g => new { g.Key.ProductId, g.Key.Type, Total = g.Sum(x => x.Quantity) })
                    .ToListAsync();

                var products = await _context.Products
                    .Where(p => companyIds.Contains(p.CompanyId))
                    .Select(p => new
                    {
                        p.Id,
                        p.Name,
                        p.Description,
                        p.Category,
                        p.Price,
                        p.PurchasePrice,
                        p.Supplier,
                        p.Sku,
                        p.Image,
                        p.CompanyId,
                        p.UserId,
                        p.HsnCode,
                        p.UnitPerPack
                    })
                    .ToListAsync();

                // Apply stock calculations in memory (single pass)
                var productsWithStock = products.Select(p =>
                {
                    var tin = stockData.FirstOrDefault(s => s.ProductId == p.Id && s.Type == "PURCHASE")?.Total ?? 0;
                    var tout = stockData.FirstOrDefault(s => s.ProductId == p.Id && s.Type == "SALE")?.Total ?? 0;
                    return new
                    {
                        p.Id,
                        p.Name,
                        p.Description,
                        p.Category,
                        p.Price,
                        p.PurchasePrice,
                        Stock = p.Price == 0 ? 0 : tin - tout, // Ensure calculation is correct
                        p.Supplier,
                        p.Sku,
                        p.Image,
                        p.CompanyId,
                        p.UserId,
                        p.HsnCode,
                        p.UnitPerPack
                    };
                }).ToList();

                // Get customers efficiently
                var customers = await _context.Customers
                    .Where(c => companyIds.Contains(c.CompanyId) && c.UserId == UserId)
                    .Select(c => new
                    {
                        c.Id,
                        c.Name,
                        c.Email,
                        c.Phone,
                        c.Address,
                        c.GstPanId,
                        c.LicenseNo,
                        c.Group,
                        c.TotalSpent,
                        c.CompanyId,
                        c.UserId
                    })
                    .ToListAsync();

                // Get transactions efficiently - for all companies but limit to recent ones to avoid data explosion
                var transactions = await _context.Transactions
                    .Where(t => companyIds.Contains(t.CompanyId))
                    .Include(t => t.Items)
                    .OrderByDescending(t => t.Date)
                    .Take(500) // Limit to avoid data explosion, frontend can load more if needed
                    .Select(t => new
                    {
                        t.Id,
                        t.Type,
                        t.TotalAmount,
                        t.TotalTax,
                        t.CgstTotal,
                        t.SgstTotal,
                        t.RoundOff,
                        t.Date,
                        t.EntityName,
                        t.EntityGstNumber,
                        t.InvoiceNumber,
                        t.CompanyId,
                        Items = t.Items.Select(i => new
                        {
                            i.Id,
                            i.ProductId,
                            i.ProductName,
                            i.HsnCode,
                            i.Quantity,
                            i.UnitPrice,
                            i.TaxRate,
                            i.TaxAmount,
                            i.TotalAmount,
                            i.CgstRate,
                            i.SgstRate,
                            i.CgstAmount,
                            i.SgstAmount
                        }).ToList()
                    })
                    .ToListAsync();

                var firstCompanyId = companies.FirstOrDefault()?.Id ?? Guid.Empty;

                return Ok(new
                {
                    companies,
                    products = productsWithStock,
                    customers,
                    transactions,
                    activeCompanyId = firstCompanyId != Guid.Empty ? firstCompanyId.ToString() : null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = "Error fetching dashboard data: " + ex.Message,
                    details = ex.InnerException?.Message
                });
            }
        }
    }
}
