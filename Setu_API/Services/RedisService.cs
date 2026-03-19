using StackExchange.Redis;
using System.Text.Json;

public class RedisService
{
    private readonly IDatabase _db;

    public RedisService(IConnectionMultiplexer redis)
    {
        _db = redis.GetDatabase();
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        var value = await _db.StringGetAsync(key);
        if (value.IsNullOrEmpty) return default;

        var json = value.ToString();
        return json != null ? JsonSerializer.Deserialize<T>(json) : default;
    }

    public async Task SetAsync<T>(string key, T data, TimeSpan expiry)
    {
        var json = JsonSerializer.Serialize(data);
        await _db.StringSetAsync(key, json, expiry);
    }
}