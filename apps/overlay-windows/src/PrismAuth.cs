using System.Net.Http;
using System.Text.Json;

namespace PrismOverlay;

/// CLI-style device pairing: opens the Prism /link page in the browser, the user
/// signs in or creates an account, and the device key is fetched and saved.
public sealed class PrismAuth
{
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(8) };
    private System.Windows.Forms.Timer? _timer;
    private string _code = "";
    private string _apiBase = "";
    private int _polls;
    private bool _inflight;
    private Action<string, bool, bool>? _update;

    private static string WebOrigin(string apiBase) =>
        apiBase.EndsWith("/api", StringComparison.Ordinal) ? apiBase[..^4] : apiBase;

    /// update(message, done, success) — called on the UI thread.
    public void Connect(Action<string, bool, bool> update)
    {
        Cancel();
        _update = update;
        _apiBase = Settings.ApiBaseUrl;
        _code = Guid.NewGuid().ToString("N"); // 32 hex chars
        _polls = 0;

        var link = $"{WebOrigin(_apiBase)}/link?code={_code}";
        try { System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(link) { UseShellExecute = true }); } catch { }
        _update?.Invoke("Opened your browser — sign in or create an account…", false, false);

        _timer = new System.Windows.Forms.Timer { Interval = 2500 };
        _timer.Tick += async (_, _) => await Poll();
        _timer.Start();
    }

    public void Cancel()
    {
        _timer?.Stop();
        _timer?.Dispose();
        _timer = null;
        _inflight = false;
    }

    private async Task Poll()
    {
        if (_inflight) return;
        if (++_polls > 120) { Cancel(); _update?.Invoke("Timed out — click Connect to try again.", true, false); return; }
        _inflight = true;
        try
        {
            using var resp = await Http.GetAsync($"{_apiBase}/auth/pair?code={_code}");
            if ((int)resp.StatusCode == 200)
            {
                var json = await resp.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("apiKey", out var k) && k.GetString() is { Length: > 0 } key)
                {
                    Settings.SaveApiKey(key);
                    Cancel();
                    _update?.Invoke("✓ Connected — live ads enabled.", true, true);
                    return;
                }
            }
            // 204 (pending) or transient error: keep waiting.
            _update?.Invoke("Waiting for you to finish in the browser…", false, false);
        }
        catch { /* transient — keep polling */ }
        finally { _inflight = false; }
    }
}
