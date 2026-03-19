using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Setu.Api.Data;
using Setu.Api.Models;
using Setu.Api.Services;
using Setu.Api.Dtos;
using System.Security.Claims;

namespace Setu.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    [Setu.Api.Filters.SubscriptionRequired]
    public class ProductsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly ISubscriptionService _subscriptionService;

        public ProductsController(ApplicationDbContext context, ISubscriptionService subscriptionService)
        {
            _context = context;
            _subscriptionService = subscriptionService;
        }

        private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        [HttpGet("{companyId}")]
        public async Task<ActionResult<PaginatedResponse<ProductResponse>>> GetProducts(Guid companyId, [FromQuery] PaginationQuery pagination)
        {
            try
            {
                // OPTIMIZATION: Get total count first
                var totalCount = await _context.Products
                    .Where(p => p.CompanyId == companyId)
                    .CountAsync();

                if (totalCount == 0)
                {
                    return Ok(new PaginatedResponse<object>(
                        new List<object>(),
                        0,
                        pagination.PageNumber,
                        pagination.PageSize,
                        false,
                        false
                    ));
                }

                // OPTIMIZATION: Fetch products with efficient projection and pagination
                var products = await _context.Products
                    .Where(p => p.CompanyId == companyId)
                    .OrderBy(p => p.Name)
                    .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                    .Take(pagination.PageSize)
                    .Select(p => new
                    {
                        p.Id,
                        p.Name,
                        p.Description,
                        p.Category,
                        p.Price,
                        p.PurchasePrice,
                        p.Stock,
                        p.Supplier,
                        p.Sku,
                        p.Image,
                        p.CompanyId,
                        p.UserId,
                        p.HsnCode,
                        p.UnitPerPack
                    })
                    .ToListAsync();

                var productIds = products.Select(p => p.Id).ToList();

                // OPTIMIZATION: Single filtered query for stock calculation
                var stockItems = await _context.TransactionItems
                    .Where(ti => productIds.Contains(ti.ProductId) && ti.Transaction!.CompanyId == companyId)
                    .GroupBy(ti => new { ti.ProductId, ti.Transaction!.Type })
                    .Select(g => new { g.Key.ProductId, g.Key.Type, Total = g.Sum(x => x.Quantity) })
                    .ToListAsync();

                // OPTIMIZATION: Single pass calculation in memory
                var result = products.Select(p =>
                {
                    var tin = stockItems.FirstOrDefault(s => s.ProductId == p.Id && s.Type == "PURCHASE")?.Total ?? 0;
                    var tout = stockItems.FirstOrDefault(s => s.ProductId == p.Id && s.Type == "SALE")?.Total ?? 0;
                    return new ProductResponse(
                        p.Id,
                        p.Name,
                        p.Description,
                        p.Category,
                        p.Price,
                        p.PurchasePrice,
                        p.Stock + tin - tout,
                        p.Supplier,
                        p.Sku,
                        p.Image,
                        p.CompanyId,
                        p.UserId,
                        p.HsnCode,
                        p.UnitPerPack
                    );
                });

                var paginatedResult = new PaginatedResponse<ProductResponse>(
                    result.ToList(),
                    totalCount,
                    pagination.PageNumber,
                    pagination.PageSize,
                    (pagination.PageNumber * pagination.PageSize) < totalCount,
                    pagination.PageNumber > 1
                );

                return Ok(paginatedResult);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Error fetching products: {ex.Message}");
            }
        }

        [HttpPost]
        public async Task<ActionResult<Product>> CreateProduct([FromBody] CreateProductDto dto)
        {
            /*
            if (!await _subscriptionService.HasActiveSubscription(UserId))
            {
                return BadRequest("Active subscription required.");
            }

            if (!await _subscriptionService.CanCreateProduct(UserId, dto.CompanyId))
            {
                return BadRequest("Product limit reached for your plan.");
            }
            */

            var product = new Product
            {
                Id = Guid.NewGuid(),
                UserId = UserId,
                CompanyId = dto.CompanyId,
                Name = dto.Name,
                Description = dto.Description,
                Category = dto.Category,
                Price = dto.Price,
                PurchasePrice = dto.PurchasePrice,
                Stock = dto.Stock,
                Supplier = dto.Supplier,
                Sku = dto.Sku,
                Image = dto.Image,
                UnitPerPack = dto.UnitPerPack,
                HsnCode = dto.HsnCode,
                CustomAttributesJson = dto.CustomAttributesJson
            };

            _context.Products.Add(product);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }

            return Ok(product);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] UpdateProductDto dto)
        {
            var existingProduct = await _context.Products.FindAsync(id);
            if (existingProduct == null) return NotFound();
            if (existingProduct.UserId != UserId) return Forbid();

            existingProduct.Name = dto.Name;
            existingProduct.Description = dto.Description;
            existingProduct.Category = dto.Category;
            existingProduct.Price = dto.Price;
            existingProduct.PurchasePrice = dto.PurchasePrice;
            existingProduct.Stock = dto.Stock;
            existingProduct.Supplier = dto.Supplier;
            existingProduct.Sku = dto.Sku;
            existingProduct.Image = dto.Image;
            existingProduct.UnitPerPack = dto.UnitPerPack;
            existingProduct.HsnCode = dto.HsnCode;
            existingProduct.CustomAttributesJson = dto.CustomAttributesJson;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                return StatusCode(409, "Product was modified by another user. Please refresh and try again.");
            }

            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteProduct(Guid id)
        {
            var product = await _context.Products.FindAsync(id);
            if (product == null) return NotFound();
            if (product.UserId != UserId) return Forbid();

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool ProductExists(Guid id)
        {
            return _context.Products.Any(e => e.Id == id);
        }
    }
}
