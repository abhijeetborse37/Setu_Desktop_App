using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Setu.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddProductHsnCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "HsnCode",
                table: "Products",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "HsnCode",
                table: "Products");
        }
    }
}
