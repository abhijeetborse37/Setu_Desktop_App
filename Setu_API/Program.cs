using System.Text;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Setu.Api.Data;
using Microsoft.OpenApi.Models;
using StackExchange.Redis;

var builder = WebApplication.CreateBuilder(args);
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://*:{port}");

// Add services to the container.
builder.Services.AddControllers()
    .AddJsonOptions(options => {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Setu Business Suite API",
        Version = "v1",
        Description = "API for Setu Business Suite - ERP and Business Management System",
        Contact = new OpenApiContact
        {
            Name = "Setu Support",
            Email = "support@setu.com"
        }
    });

    // JWT Authentication for Swagger
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = @"JWT Authorization header using the Bearer scheme.
                      Enter 'Bearer' [space] and then your token in the text input below.
                      Example: 'Bearer 12345abcdef'",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // Enable annotations for better documentation
    // c.EnableAnnotations();
});

// DbContext setup with resilient connection handling for Railway Postgres
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsqlOptionsAction: sqlOptions =>
        {
            sqlOptions.EnableRetryOnFailure(
                maxRetryCount: 10,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorCodesToAdd: null);
        }));

//Added Redis Connection Multiplexer
var redisConnection = builder.Configuration["REDIS_CONNECTION"];
if (!string.IsNullOrEmpty(redisConnection))
{
    builder.Services.AddSingleton<IConnectionMultiplexer>(
        ConnectionMultiplexer.Connect(redisConnection)
    );
    builder.Services.AddScoped<RedisService>();
}

// Add response caching for performance
builder.Services.AddResponseCaching(options =>
{
    options.MaximumBodySize = 1024 * 1024 * 10; // 10MB
    options.UseCaseSensitivePaths = false;
});

// Add output caching for frequently accessed endpoints
builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(builder => builder.Expire(TimeSpan.FromMinutes(5)));
    options.AddPolicy("AdminStats", builder => builder.Expire(TimeSpan.FromMinutes(1)));
});

// Services
builder.Services.AddScoped<Setu.Api.Services.ISubscriptionService, Setu.Api.Services.SubscriptionService>();
//builder.Services.AddHostedService<KeepAliveService>();

// Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!))
        };
    });

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                "https://setu.abhijitborse3797.workers.dev",
                "http://localhost:5173"
            )
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

var app = builder.Build();

// ===== AUTO-SEED SUPER ADMIN ON FIRST RUN =====
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try
    {
        db.Database.Migrate(); // Ensure migrations are applied

        var hasAdmin = db.Users.Any(u => u.Role == Setu.Api.Models.UserRole.Admin);
        if (!hasAdmin)
        {
            var adminPassword = "Admin@123";
            var adminUser = new Setu.Api.Models.User
            {
                Id = Guid.NewGuid(),
                Name = "Super Admin",
                Email = "admin@setu.in",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(adminPassword),
                Role = Setu.Api.Models.UserRole.Admin,
                ContactNo = "9999999999",
                AllowedTabsPattern = "*",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            db.Users.Add(adminUser);
            db.SaveChanges();

            logger.LogInformation("==============================================");
            logger.LogInformation("  SUPER ADMIN SEEDED SUCCESSFULLY!");
            logger.LogInformation("  Email   : admin@setu.in");
            logger.LogInformation("  Password: Admin@123");
            logger.LogInformation("  CHANGE THIS PASSWORD AFTER FIRST LOGIN!");
            logger.LogInformation("==============================================");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "Error during database seeding.");
    }
}
// ===== END SEEDING =====

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Setu API v1");
        c.RoutePrefix = "swagger"; // Available at http://localhost:PORT/swagger
    });
}

app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Setu API v1");
    c.RoutePrefix = "swagger";
});

// Exception logging and handling
app.UseExceptionHandler(exceptionHandlerApp =>
{
    exceptionHandlerApp.Run(async context =>
    {
        var exceptionHandlerPathFeature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerPathFeature>();
        var exception = exceptionHandlerPathFeature?.Error;

        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";

        // Add explicit CORS headers to the error response so the frontend isn't blocked by CORS policies.
        var origin = context.Request.Headers["Origin"].ToString();
        if (origin == "https://setu.abhijitborse3797.workers.dev" || origin == "http://localhost:5173")
        {
            context.Response.Headers.Append("Access-Control-Allow-Origin", origin);
            context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");
        }

        await context.Response.WriteAsJsonAsync(new 
        { 
            message = "Database or Internal Error Occurred.",
            details = exception?.Message,
            inner = exception?.InnerException?.Message
        });
    });
});

app.UseRouting();

// CORS is best placed after UseRouting and before Auth
app.UseCors("AllowFrontend");

app.UseAuthentication();
app.UseAuthorization();

// Add response caching middleware
app.UseResponseCaching();

// Add output caching middleware
app.UseOutputCache();

app.MapControllers();

app.MapGet("/", () => "SETU ERP API Running...");

// Health check endpoint for keep-alive ping
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.Run();

// ===== KEEP-ALIVE BACKGROUND SERVICE =====
// Prevents Render free tier from putting the server to sleep
public class KeepAliveService : BackgroundService
{
    private readonly ILogger<KeepAliveService> _logger;
    private readonly IConfiguration _configuration;

    public KeepAliveService(ILogger<KeepAliveService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var selfUrl = _configuration["RENDER_EXTERNAL_URL"] 
                      ?? _configuration["SELF_URL"] 
                      ?? null;

        if (string.IsNullOrEmpty(selfUrl))
        {
            _logger.LogWarning("KeepAlive: No RENDER_EXTERNAL_URL or SELF_URL configured. Keep-alive disabled.");
            return;
        }

        using var httpClient = new HttpClient();
        httpClient.Timeout = TimeSpan.FromSeconds(30);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromMinutes(14), stoppingToken);
                var response = await httpClient.GetAsync($"{selfUrl}/health", stoppingToken);
                _logger.LogInformation("KeepAlive ping: {StatusCode} at {Time}", response.StatusCode, DateTime.UtcNow);
            }
            catch (TaskCanceledException)
            {
                // Server is shutting down, ignore
            }
            catch (Exception ex)
            {
                _logger.LogWarning("KeepAlive ping failed: {Message}", ex.Message);
            }
        }
    }
}
