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
    public class CustomersController : ControllerBase
    {
        private readonly ApplicationDbContext _context;

        public CustomersController(ApplicationDbContext context)
        {
            _context = context;
        }

        private Guid UserId => Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        [HttpGet("{companyId}")]
        public async Task<ActionResult<PaginatedResponse<Customer>>> GetCustomers(Guid companyId, [FromQuery] PaginationQuery pagination)
        {
            var totalCount = await _context.Customers
                .Where(c => c.UserId == UserId && c.CompanyId == companyId)
                .CountAsync();

            var customers = await _context.Customers
                .Where(c => c.UserId == UserId && c.CompanyId == companyId)
                .OrderBy(c => c.Name)
                .Skip((pagination.PageNumber - 1) * pagination.PageSize)
                .Take(pagination.PageSize)
                .ToListAsync();

            var paginatedResult = new PaginatedResponse<Customer>(
                customers,
                totalCount,
                pagination.PageNumber,
                pagination.PageSize,
                (pagination.PageNumber * pagination.PageSize) < totalCount,
                pagination.PageNumber > 1
            );

            return Ok(paginatedResult);
        }

        [HttpPost]
        public async Task<ActionResult<Customer>> CreateCustomer([FromBody] CreateCustomerDto dto)
        {
            try
            {
                var customer = new Customer
                {
                    Id = Guid.NewGuid(),
                    UserId = UserId,
                    CompanyId = dto.CompanyId,
                    Name = dto.Name,
                    Email = dto.Email,
                    Phone = dto.Phone,
                    Address = dto.Address,
                    GstPanId = dto.GstPanId,
                    LicenseNo = dto.LicenseNo,
                    Group = dto.Group
                };

                _context.Customers.Add(customer);
                await _context.SaveChangesAsync();

                return Ok(customer);
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpdateCustomerDto dto)
        {
            try
            {
                var existingCustomer = await _context.Customers.FindAsync(id);
                if (existingCustomer == null) return NotFound();
                if (existingCustomer.UserId != UserId) return Forbid();

                existingCustomer.Name = dto.Name;
                existingCustomer.Email = dto.Email;
                existingCustomer.Phone = dto.Phone;
                existingCustomer.Address = dto.Address;
                existingCustomer.GstPanId = dto.GstPanId;
                existingCustomer.LicenseNo = dto.LicenseNo;
                existingCustomer.Group = dto.Group;

                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCustomer(Guid id)
        {
            try 
            {
                var customer = await _context.Customers.FindAsync(id);
                if (customer == null) return NotFound();
                if (customer.UserId != UserId) return Forbid();

                _context.Customers.Remove(customer);
                await _context.SaveChangesAsync();
                return NoContent();
            }
            catch (Exception ex)
            {
                return StatusCode(500, $"Database error: {ex.Message}. Inner: {ex.InnerException?.Message}");
            }
        }
    }
}
