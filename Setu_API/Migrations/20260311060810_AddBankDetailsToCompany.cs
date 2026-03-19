using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Setu.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddBankDetailsToCompany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BankName",
                table: "Companies",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BranchName",
                table: "Companies",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BranchName",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "BankName",
                table: "Companies");
        }
    }
}

