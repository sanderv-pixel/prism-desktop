using System.Drawing.Drawing2D;

namespace PrismOverlay;

/// The floating ad pill: borderless, topmost, non-activating, clickable.
public sealed class OverlayWindow : Form
{
    private Ad? _ad;
    public event Action? Clicked;

    private static readonly Font NameFont = new("Segoe UI", 9f, FontStyle.Bold);
    private static readonly Font CopyFont = new("Segoe UI", 9f, FontStyle.Underline);
    private static readonly Font BadgeFont = new("Segoe UI", 8.5f, FontStyle.Bold);
    private static readonly Font AdFont = new("Segoe UI", 7.5f, FontStyle.Bold);

    public OverlayWindow()
    {
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        TopMost = true;
        StartPosition = FormStartPosition.Manual;
        BackColor = Color.FromArgb(20, 20, 20);
        DoubleBuffered = true;
        Height = 28;
        Width = 240;
        Visible = false;
    }

    protected override bool ShowWithoutActivation => true;

    protected override CreateParams CreateParams
    {
        get
        {
            const int WS_EX_TOPMOST = 0x00000008;
            const int WS_EX_TOOLWINDOW = 0x00000080;
            const int WS_EX_NOACTIVATE = 0x08000000;
            var cp = base.CreateParams;
            cp.ExStyle |= WS_EX_TOPMOST | WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE;
            return cp;
        }
    }

    public void ShowAd(Ad ad, Rectangle anchor)
    {
        _ad = ad;
        var nameW = TextRenderer.MeasureText(ad.AdvertiserName, NameFont).Width;
        var copyW = TextRenderer.MeasureText("  " + ad.Copy, CopyFont).Width;
        Width = 31 + nameW + copyW + 30; // badge + text + "Ad" tag

        int x = anchor.Right + 10;
        int y = anchor.Y + anchor.Height / 2 - Height / 2;
        SetBounds(x, y, Width, Height);
        Region = new Region(Rounded(new Rectangle(0, 0, Width, Height), 8));
        Invalidate();
        if (!Visible) Show();
    }

    public void HideAd()
    {
        if (Visible) Hide();
    }

    protected override void OnPaint(PaintEventArgs e)
    {
        var g = e.Graphics;
        g.SmoothingMode = SmoothingMode.AntiAlias;

        using (var bg = new SolidBrush(Color.FromArgb(240, 20, 20, 20)))
        using (var path = Rounded(new Rectangle(0, 0, Width - 1, Height - 1), 8))
            g.FillPath(bg, path);

        if (_ad is null) return;

        var badge = new Rectangle(8, 6, 16, 16);
        using (var bb = new SolidBrush(_ad.Color))
        using (var bp = Rounded(badge, 4))
            g.FillPath(bb, bp);
        TextRenderer.DrawText(g, _ad.AdvertiserName.Substring(0, 1).ToUpperInvariant(), BadgeFont, badge, Color.White,
            TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);

        int tx = 31;
        TextRenderer.DrawText(g, _ad.AdvertiserName, NameFont, new Point(tx, 6), Color.White);
        var nameW = TextRenderer.MeasureText(_ad.AdvertiserName, NameFont).Width;
        TextRenderer.DrawText(g, "  " + _ad.Copy, CopyFont, new Point(tx + nameW, 6), Color.FromArgb(220, 220, 220));
        TextRenderer.DrawText(g, "Ad", AdFont, new Point(Width - 22, 8), Color.FromArgb(120, 120, 120));
    }

    private static GraphicsPath Rounded(Rectangle r, int radius)
    {
        var path = new GraphicsPath();
        int d = radius * 2;
        path.AddArc(r.X, r.Y, d, d, 180, 90);
        path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }

    protected override void OnClick(EventArgs e) => Clicked?.Invoke();
}
