using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Setu.Api.Data;
using Setu.Api.Models;
using Setu.Api.Dtos;
using System.Security.Claims;

namespace Setu.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [Setu.Api.Filters.SubscriptionRequired]
    public class TransactionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public TransactionsController(ApplicationDbContext context)
        {
            _context = context;
        }

        private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        [HttpGet("{companyId}")]
        public async Task<ActionResult<PaginatedResponse<TransactionResponse>>> GetTransactions(Guid companyId, [FromQuery] PaginationQuery pagination)
        {
            // OPTIMIZATION: Get total count first
            var totalCount = await _context.Transactions
                .Where(t => t.CompanyId == companyId)
                .CountAsync();

            // OPTIMIZATION: Use projections with pagination instead of loading all entities
            var transactions = await _context.Transactions
                .Where(t => t.CompanyId == companyId)
                .OrderByDescending(t => t.Date)
                .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .Select(t => new TransactionResponse(
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
                    t.Items.Select(i => new TransactionItemResponse(
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
                    )).ToList()
                ))
                .ToListAsync();

            var paginatedResult = new PaginatedResponse<TransactionResponse>(
                transactions,
                totalCount,
                pagination.PageNumber,
                pagination.PageSize,
                (pagination.PageNumber * pagination.PageSize) < totalCount,
                pagination.PageNumber > 1
            );

            return Ok(paginatedResult);
        }

        [HttpPost]
        public async Task<ActionResult<Transaction>> CreateTransaction([FromBody] CreateTransactionDto dto)
        {
            // OPTIMIZATION: Batch fetch all products needed instead of fetching one by one
            var productIds = dto.Items.Select(i => i.ProductId).Distinct().ToList();
            var products = await _context.Products
                .Where(p => productIds.Contains(p.Id))
                .ToDictionaryAsync(p => p.Id);

            var transaction = new Transaction
            {
                Id = Guid.NewGuid(),
                UserId = UserId,
                CompanyId = dto.CompanyId,
                Type = dto.Type,
                TotalAmount = dto.TotalAmount,
                TotalTax = dto.TotalTax,
                CgstTotal = dto.CgstTotal,
                SgstTotal = dto.SgstTotal,
                RoundOff = dto.RoundOff,
                Date = DateTime.SpecifyKind(dto.Date, DateTimeKind.Utc),
                EntityName = dto.EntityName,
                EntityGstNumber = dto.EntityGstNumber,
                InvoiceNumber = dto.InvoiceNumber ?? "TXN-" + Guid.NewGuid().ToString().Substring(0, 8).ToUpper(),
                Items = dto.Items.Select(item => new TransactionItem
                {
                    Id = Guid.NewGuid(),
                    TransactionId = Guid.Empty, // Will be set after transaction is created
                    ProductId = item.ProductId,
                    ProductName = string.IsNullOrEmpty(item.ProductName) && products.TryGetValue(item.ProductId, out var product) ? product.Name : item.ProductName,
                    HsnCode = string.IsNullOrEmpty(item.HsnCode) && products.TryGetValue(item.ProductId, out var prod) ? prod.HsnCode : item.HsnCode,
                    Quantity = item.Quantity,
                    UnitPrice = item.UnitPrice,
                    TaxRate = item.TaxRate,
                    TaxAmount = item.TaxAmount,
                    TotalAmount = item.TotalAmount,
                    CgstRate = item.CgstRate,
                    SgstRate = item.SgstRate,
                    CgstAmount = item.CgstAmount,
                    SgstAmount = item.SgstAmount
                }).ToList()
            };

            // Set TransactionId for items
            foreach (var item in transaction.Items)
            {
                item.TransactionId = transaction.Id;
            }

            try
            {
                _context.Transactions.Add(transaction);
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }

            return Ok(transaction);
        }
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTransaction(Guid id, Transaction transaction)
        {
            Console.WriteLine($"Updating Transaction: {id} (Body ID: {transaction.Id})");
            
            if (id != transaction.Id) return BadRequest("ID Mismatch");
            if (transaction.UserId != UserId) return Forbid();

            try
            {
                var existing = await _context.Transactions
                    .Include(t => t.Items)
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (existing == null) {
                    Console.WriteLine($"Transaction {id} not found in database.");
                    return NotFound();
                }

                // Update basic properties
                existing.Type = transaction.Type;
                existing.Date = DateTime.SpecifyKind(transaction.Date, DateTimeKind.Utc);
                existing.EntityName = transaction.EntityName;
                existing.TotalAmount = transaction.TotalAmount;
                existing.TotalTax = transaction.TotalTax;
                
                if (!string.IsNullOrEmpty(transaction.InvoiceNumber)) {
                    existing.InvoiceNumber = transaction.InvoiceNumber;
                }

                // OPTIMIZATION: Batch fetch all products instead of one-by-one
                var productIds = transaction.Items.Select(i => i.ProductId).Distinct().ToList();
                var products = await _context.Products
                    .Where(p => productIds.Contains(p.Id))
                    .ToDictionaryAsync(p => p.Id);

                // Update Items: Clear and Re-add (Cleanest way for simple transactions)
                _context.TransactionItems.RemoveRange(existing.Items);
                
                foreach (var item in transaction.Items)
                {
                    item.Id = Guid.NewGuid();
                    item.TransactionId = id;
                    
                    // Use pre-loaded products instead of individual lookups
                    if (products.TryGetValue(item.ProductId, out var product))
                    {
                        if (string.IsNullOrEmpty(item.ProductName))
                            item.ProductName = product.Name;
                        if (string.IsNullOrEmpty(item.HsnCode))
                            item.HsnCode = product.HsnCode;
                    }
                    
                    _context.TransactionItems.Add(item);
                }

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (DbUpdateConcurrencyException ex)
            {
                Console.WriteLine("Concurrency error: " + ex.Message);
                return Conflict("The record was modified or deleted by another user.");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Update error: " + ex.Message);
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(Guid id)
        {
            var transaction = await _context.Transactions.FindAsync(id);
            if (transaction == null) return NotFound();
            if (transaction.UserId != UserId) return Forbid();

            _context.Transactions.Remove(transaction);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
