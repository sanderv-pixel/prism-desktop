using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;

namespace PrismOverlay;

public sealed class Ad
{
    public string Id = "";
    public string AdvertiserName = "";
    public string Copy = "";
    public string? ClickUrl;
    public string? ImpressionToken;
    public string? UserId;
    public string? SessionId;
    public Color Color = Color.FromArgb(124, 80, 252);
}

/// Fetches ads from the Prism API and reports views + clicks. Falls back to
/// built-in demo ads when the API is unreachable (or no key is set).
public sealed class AdClient
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(6) };
    private readonly string _sessionId = Guid.NewGuid().ToString("N");
    private readonly object _lock = new();
    private List<Ad> _queue;
    private int _cursor;

    public AdClient() => _queue = new List<Ad>();

    // A connected account = an API key. Prism shows nothing without one.
    public bool IsConnected => Settings.ApiKey.Length > 0;

    // The next ad, or null when there's no inventory (no account / nothing served).
    public Ad? NextAd()
    {
        lock (_lock)
        {
            if (_queue.Count == 0) return null; // no demo fallback — require a connected account
            var ad = _queue[_cursor % _queue.Count];
            _cursor++;
            return ad;
        }
    }

    // Honest + minimal context: editor + tool + wait state. No code or prompts.
    private static object Context() => new
    {
        editor = "claude-desktop",
        aiTool = "claude",
        intent = "coding",
        audience = "developers",
        waitState = true,
    };

    private static HttpRequestMessage Post(string path, object body)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, $"{Settings.ApiBaseUrl}/{path}")
        {
            Content = JsonContent.Create(body),
        };
        var key = Settings.ApiKey;
        if (key.Length > 0) req.Headers.TryAddWithoutValidation("X-Prism-Api-Key", key);
        return req;
    }

    public async void Refresh()
    {
        try
        {
            var body = new { context = Context(), userId = _sessionId, sessionId = _sessionId, hiddenAdvertisers = Array.Empty<string>() };
            using var resp = await Http.SendAsync(Post("ads", body));
            if (!resp.IsSuccessStatusCode) return;
            var json = await resp.Content.ReadAsStringAsync();
            if (string.IsNullOrWhiteSpace(json)) return;

            using var doc = JsonDocument.Parse(json);
            var r = doc.RootElement;
            string Str(string name) => r.TryGetProperty(name, out var v) ? (v.GetString() ?? "") : "";
            var id = Str("id");
            var name2 = Str("advertiserName");
            var copy = Str("copy");
            if (id.Length == 0 || name2.Length == 0 || copy.Length == 0) return;

            var clickUrl = Str("clickUrl");
            if (clickUrl.Length == 0) clickUrl = Str("url");
            var ad = new Ad
            {
                Id = id,
                AdvertiserName = name2,
                Copy = copy,
                ClickUrl = clickUrl.Length > 0 ? clickUrl : null,
                ImpressionToken = Str("impressionToken") is { Length: > 0 } t ? t : null,
                UserId = Str("userId") is { Length: > 0 } u ? u : null,
                SessionId = Str("sessionId") is { Length: > 0 } s ? s : null,
            };
            lock (_lock) { _queue = new List<Ad> { ad }; _cursor = 0; }
        }
        catch { /* keep current/built-in queue */ }
    }

    public async void ReportImpression(Ad ad, long durationMs)
    {
        if (string.IsNullOrEmpty(ad.ImpressionToken)) return; // demo ads aren't billable
        try
        {
            var body = new
            {
                userId = ad.UserId ?? _sessionId,
                sessionId = ad.SessionId ?? _sessionId,
                campaignId = ad.Id,
                impressionToken = ad.ImpressionToken,
                durationMs,
                context = Context(),
            };
            using var _ = await Http.SendAsync(Post("impressions", body));
        }
        catch { }
    }

    // Opening the click URL hits /api/clicks, which records the click and
    // redirects to the advertiser.
    public void RegisterClick(Ad ad)
    {
        var target = ad.ClickUrl;
        if (string.IsNullOrEmpty(target)) return;
        if (!target.StartsWith("http", StringComparison.OrdinalIgnoreCase)) return;
        try
        {
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(target) { UseShellExecute = true });
        }
        catch { }
    }
}
