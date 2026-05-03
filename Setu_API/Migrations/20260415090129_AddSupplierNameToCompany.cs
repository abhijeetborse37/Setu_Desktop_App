using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Setu.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSupplierNameToCompany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SupplierName",
                table: "Companies",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SupplierName",
                table: "Companies");
        }
    }
}
