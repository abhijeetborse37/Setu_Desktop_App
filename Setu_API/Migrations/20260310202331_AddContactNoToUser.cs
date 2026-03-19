using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Setu.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddContactNoToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactNo",
                table: "Users",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactNo",
                table: "Users");
        }
    }
}
