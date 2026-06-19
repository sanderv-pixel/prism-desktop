namespace PrismOverlay;

/// First-run window. On Windows there's no permission to grant (UIA is
/// read-only and needs no consent), so onboarding is just the optional account
/// connect via the browser device flow.
public sealed class Onboarding : Form
{
    private readonly Label _status;
    private readonly PrismAuth _auth = new();

    public Onboarding()
    {
        Text = "Welcome to Prism";
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(460, 300);
        BackColor = Color.FromArgb(18, 18, 18);
        ForeColor = Color.White;

        Controls.Add(new Label { Text = "Prism", Font = new Font("Segoe UI", 20f, FontStyle.Bold), AutoSize = true, Location = new Point(24, 20) });
        Controls.Add(new Label { Text = "Earn while Claude works.", AutoSize = true, Location = new Point(26, 60), ForeColor = Color.Gainsboro });
        Controls.Add(new Label
        {
            Text = "Prism shows one small sponsored line next to Claude's activity while it works — only then. It reads the UI through Windows accessibility and never modifies Claude. No permission needed.",
            AutoSize = false,
            Location = new Point(26, 92),
            Size = new Size(408, 60),
            ForeColor = Color.Silver,
        });

        var connect = new Button { Text = "Connect account", Location = new Point(26, 166), Size = new Size(160, 32), FlatStyle = FlatStyle.System };
        connect.Click += (_, _) => Connect();
        Controls.Add(connect);

        _status = new Label
        {
            Text = "Required — Prism shows ads only once connected. Opens your browser to sign in or create an account; nothing to copy.",
            AutoSize = false,
            Location = new Point(26, 206),
            Size = new Size(408, 40),
            ForeColor = Color.Gray,
        };
        Controls.Add(_status);

        var done = new Button { Text = "Done", Location = new Point(348, 252), Size = new Size(96, 30), FlatStyle = FlatStyle.System };
        done.Click += (_, _) => Finish();
        Controls.Add(done);

        if (Settings.ApiKey.Length > 0)
        {
            _status.Text = "✓ Account connected — live ads enabled.";
            _status.ForeColor = Color.LightGreen;
        }
    }

    public void ShowOnboarding()
    {
        if (Visible) { BringToFront(); Activate(); return; }
        Show();
        BringToFront();
        Activate();
    }

    private void Connect()
    {
        _status.ForeColor = Color.Gainsboro;
        _status.Text = "Opening your browser…";
        _auth.Connect((msg, done, success) =>
        {
            if (IsDisposed) return;
            _status.Text = msg;
            _status.ForeColor = success ? Color.LightGreen : (done ? Color.IndianRed : Color.Gainsboro);
        });
    }

    private void Finish()
    {
        Settings.OnboardingDone = true;
        Hide();
    }
}
