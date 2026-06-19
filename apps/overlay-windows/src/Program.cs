namespace PrismOverlay;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.SetHighDpiMode(HighDpiMode.PerMonitorV2);
        Application.Run(new PrismAppContext());
    }
}

/// Tray app: poll Claude's UI for the work indicator, show the pill next to it
/// while working, rotate ads, and account for viewable impressions.
internal sealed class PrismAppContext : ApplicationContext
{
    private const int PollMs = 400;       // detection cadence
    private const int RotateTicks = 15;   // ~6s ad rotation
    private const long MinDwellMs = 5000; // viewable-impression threshold

    private readonly NotifyIcon _tray;
    private readonly ToolStripMenuItem _pauseItem;
    private readonly System.Windows.Forms.Timer _timer;
    private readonly UiaDetector _detector = new();
    private readonly OverlayWindow _overlay = new();
    private readonly AdClient _ads = new();
    private Onboarding? _onboarding;

    private Ad? _currentAd;
    private bool _paused;
    private int _tick;
    private int _missStreak;

    private long _visibleSince;
    private long _accumulatedMs;
    private bool _impressionReported;

    public PrismAppContext()
    {
        _overlay.Clicked += () => { if (_currentAd is not null) _ads.RegisterClick(_currentAd); };
        _ads.Refresh();

        _pauseItem = new ToolStripMenuItem("Pause", null, (_, _) => TogglePause());
        var menu = new ContextMenuStrip();
        menu.Items.Add(_pauseItem);
        menu.Items.Add(new ToolStripMenuItem("Connect account…", null, (_, _) => ShowOnboarding()));
        menu.Items.Add(new ToolStripSeparator());
        menu.Items.Add(new ToolStripMenuItem("Quit Prism", null, (_, _) => Quit()));

        _tray = new NotifyIcon
        {
            Icon = SystemIcons.Application,
            Text = "Prism — sponsored line while Claude works",
            Visible = true,
            ContextMenuStrip = menu,
        };

        _timer = new System.Windows.Forms.Timer { Interval = PollMs };
        _timer.Tick += (_, _) => Poll();
        _timer.Start();

        if (!Settings.OnboardingDone) ShowOnboarding();
    }

    private void TogglePause()
    {
        _paused = !_paused;
        _pauseItem.Text = _paused ? "Resume" : "Pause";
        if (_paused) HideOverlay();
    }

    private void ShowOnboarding()
    {
        _onboarding ??= new Onboarding();
        _onboarding.ShowOnboarding();
    }

    private void Poll()
    {
        if (_paused) { HideOverlay(); return; }
        _tick++;
        var ind = _detector.Detect();
        if (ind.Found)
        {
            _missStreak = 0;
            ShowOverlay(ind.Rect);
        }
        else if (++_missStreak >= 3)
        {
            HideOverlay();
        }
    }

    private void ShowOverlay(Rectangle rect)
    {
        if (_currentAd is null || _tick % RotateTicks == 0)
        {
            FlushImpression();
            _currentAd = _ads.NextAd();
            ResetDwell();
            _ads.Refresh(); // prefetch a fresh ad + single-use impression token
        }
        _overlay.ShowAd(_currentAd!, rect);
        AccrueDwell();
    }

    private void HideOverlay()
    {
        _overlay.HideAd();
        FlushImpression();
        ResetDwell();
    }

    private static long NowMs() => DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

    private void ResetDwell()
    {
        _visibleSince = 0;
        _accumulatedMs = 0;
        _impressionReported = false;
    }

    private void AccrueDwell()
    {
        var now = NowMs();
        if (_visibleSince > 0) _accumulatedMs += now - _visibleSince;
        _visibleSince = now;
        if (!_impressionReported && _accumulatedMs >= MinDwellMs && _currentAd is not null)
        {
            _impressionReported = true;
            _ads.ReportImpression(_currentAd, _accumulatedMs);
        }
    }

    private void FlushImpression()
    {
        if (_visibleSince > 0)
        {
            _accumulatedMs += NowMs() - _visibleSince;
            _visibleSince = 0;
        }
        if (!_impressionReported && _accumulatedMs >= MinDwellMs && _currentAd is not null)
        {
            _impressionReported = true;
            _ads.ReportImpression(_currentAd, _accumulatedMs);
        }
    }

    private void Quit()
    {
        _timer.Stop();
        _tray.Visible = false;
        _tray.Dispose();
        _detector.Dispose();
        ExitThread();
    }
}
