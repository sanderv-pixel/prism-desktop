using Microsoft.Win32;

namespace PrismOverlay;

/// Persisted settings (HKCU\Software\Prism\Overlay) + env overrides.
internal static class Settings
{
    private const string KeyPath = @"Software\Prism\Overlay";

    private static string? Get(string name)
    {
        using var k = Registry.CurrentUser.OpenSubKey(KeyPath);
        return k?.GetValue(name) as string;
    }

    private static void Set(string name, string value)
    {
        using var k = Registry.CurrentUser.CreateSubKey(KeyPath);
        k.SetValue(name, value);
    }

    public static string ApiBaseUrl
    {
        get
        {
            var env = Environment.GetEnvironmentVariable("PRISM_API_URL");
            var url = !string.IsNullOrEmpty(env) ? env : (Get("ApiUrl") ?? "https://goprism.dev/api");
            return url.TrimEnd('/');
        }
    }

    public static string ApiKey
    {
        get
        {
            var env = Environment.GetEnvironmentVariable("PRISM_API_KEY");
            return !string.IsNullOrEmpty(env) ? env : (Get("ApiKey") ?? "");
        }
    }

    public static void SaveApiKey(string key) => Set("ApiKey", key);

    public static bool OnboardingDone
    {
        get => Get("OnboardingDone") == "1";
        set => Set("OnboardingDone", value ? "1" : "0");
    }
}
