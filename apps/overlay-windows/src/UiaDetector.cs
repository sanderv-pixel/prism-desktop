using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.UIA3;

namespace PrismOverlay;

public struct WorkIndicator
{
    public bool Found;
    public Rectangle Rect; // screen pixels
}

/// Read-only UI Automation: find Claude's window and the "working" status text.
///
/// NOTE: unlike macOS Accessibility, Windows UIA does not expose CSS classes, so
/// we detect by the thinking-verb status text (e.g. "thinking…", "almost done
/// thinking…"). This is the part most likely to need tuning the first time it
/// runs against Claude on real Windows — the verb set and the tree shape may
/// differ. Chromium builds its UIA tree lazily once an assistive client (this
/// app) starts querying it.
public sealed class UiaDetector : IDisposable
{
    private readonly UIA3Automation _automation = new();

    private static readonly string[] Verbs =
    {
        "thinking", "sifting", "fathoming", "honing", "weighing", "pondering",
        "contemplating", "cogitating", "picturing", "musing", "figuring", "reckoning",
        "mulling", "triangulating", "crystallizing", "sleuthing", "untangling",
        "simmering", "deliberating", "ruminating", "noodling", "percolating",
        "stewing", "brewing", "churning", "marinating", "working", "reasoning",
        "processing", "crafting", "wrangling", "puzzling", "cooking",
    };

    private static readonly HashSet<string> Prefix = new(StringComparer.OrdinalIgnoreCase)
    {
        "almost", "done", "nearly", "still", "just", "about", "getting",
        "wrapping", "finishing", "finalizing", "so", "very", "keep",
    };

    private static bool IsStatusPhrase(string? text)
    {
        if (string.IsNullOrEmpty(text)) return false;
        var s = text.Trim();
        if (!s.EndsWith("…") && !s.EndsWith("...")) return false;
        s = s.TrimEnd('.', '…', ' ');
        if (s.Length == 0 || s.Length > 28) return false;
        var tokens = s.ToLowerInvariant().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (tokens.Length < 1 || tokens.Length > 4) return false;
        if (!Verbs.Contains(tokens[^1])) return false;
        for (int i = 0; i < tokens.Length - 1; i++)
            if (!Prefix.Contains(tokens[i])) return false;
        return true;
    }

    public WorkIndicator Detect()
    {
        var result = new WorkIndicator();
        try
        {
            foreach (var p in System.Diagnostics.Process.GetProcessesByName("Claude"))
            {
                if (p.MainWindowHandle == IntPtr.Zero) continue;
                AutomationElement? win;
                try { win = _automation.FromHandle(p.MainWindowHandle); }
                catch { continue; }
                if (win is null) continue;

                var hit = Search(win, 0);
                if (hit is not null)
                {
                    result.Found = true;
                    result.Rect = hit.BoundingRectangle;
                    return result;
                }
            }
        }
        catch { }
        return result;
    }

    private static AutomationElement? Search(AutomationElement el, int depth)
    {
        if (depth > 45) return null;
        try
        {
            if (el.ControlType == ControlType.Text && IsStatusPhrase(el.Name))
                return el;

            foreach (var child in el.FindAllChildren())
            {
                var hit = Search(child, depth + 1);
                if (hit is not null) return hit;
            }
        }
        catch { /* element went away mid-walk */ }
        return null;
    }

    public void Dispose() => _automation.Dispose();
}
