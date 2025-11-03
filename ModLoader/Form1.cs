using DCTS.Classes;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Win32;
using Renci.SshNet;
using System;
using System.Diagnostics;
using System.IO.Pipes;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.ConstrainedExecution;
using System.Runtime.InteropServices;
using System.Web;

namespace ModLoader
{
    public partial class Form1 : Form
    {
        public static WebView2 webView;
        private string launchUri;

        public static JSBridge bridge;
        public static StorageHelper storage;
        public static URIHelper urihelper;
        public static Form1 formhelper;
        public static GitHubHelper githubHelper;
        public static DCTSHelper dctsHelper;
        public static CryptoHelper cryptoHelper;

        public static System.Windows.Forms.Timer fadeTimer;
        public static bool isFadingOut = false;
        public static bool isDebug = false;
        public static string branch = "main";
        private bool didInit = false;

        public static string appPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "dcts");


        // some hacky shit
        [DllImport("dwmapi.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

        const int DWMWA_USE_IMMERSIVE_DARK_MODE = 20;

        private void EnableDarkTitlebar(IntPtr handle)
        {
            int useDark = 1;
            DwmSetWindowAttribute(handle, DWMWA_USE_IMMERSIVE_DARK_MODE, ref useDark, sizeof(int));
        }

        public static string GetVersion()
        {
            return (Assembly.GetExecutingAssembly().GetName().Version).ToString();
        }

        public static bool HandleArgs(params string[] values)
        {
            var frame = new StackTrace().GetFrame(1); 
            var method = frame.GetMethod();
            var callerName = $"{method.DeclaringType?.Name}.{method.Name}";

            foreach (var v in values)
            {
                if (string.IsNullOrWhiteSpace(v))
                {
                    string error = $"[{callerName}] Missing argument";

                    Logger.Log(error);
                    MessageBox.Show("There was an internal error :/\n" +
                                    "The error was logged in the log file..\n\n" +
                                    "" +
                                    "Error: \n" +
                                    $"{error}",
                                    "DCTS",
                                    MessageBoxButtons.OK, MessageBoxIcon.Hand);
                    return false;
                }
            }

            return true;
        }


        public Form1(string uri = null)
        {
            isDebug = System.Diagnostics.Debugger.IsAttached;

            bridge = new JSBridge();
            storage = new StorageHelper();
            urihelper = new URIHelper();
            githubHelper = new GitHubHelper();
            dctsHelper = new DCTSHelper();
            cryptoHelper = new CryptoHelper();

            URIHelper.RegisterUriScheme();

            launchUri = uri;
            if (!string.IsNullOrEmpty(launchUri))
            {
                URIHelper.HandleCustomUri(launchUri);

            }

            // Hide until it has loaded the page
            this.Opacity = 0;
            this.StartPosition = FormStartPosition.CenterScreen;            

            InitializeComponent();
            Task.Run(() => ListenForUrisAsync());


            webView = new WebView2
            {
                Dock = DockStyle.Fill
            };

            this.Controls.Add(webView);

            InitializeAsync();

            this.Text = $"DCTS | {GetVersion()}";
        }

        private int GetWidth(int percent)
        {
            Screen screen = Screen.PrimaryScreen;
            return (int)(screen.WorkingArea.Width / 100) * percent;
        }

        private int GetHeight(int percent)
        {
            Screen screen = Screen.PrimaryScreen;
            return (int)(screen.WorkingArea.Height / 100) * percent;
        }

        public static Task<string> CallJsFunctionSafe(string functionName, params object[] args)
        {
            if (webView.InvokeRequired)
            {
                var tcs = new TaskCompletionSource<string>();
                webView.BeginInvoke(new Action(async () =>
                {
                    try
                    {
                        string result = await CallJsFunctionInternal(functionName, args);
                        tcs.TrySetResult(result);
                    }
                    catch (Exception ex)
                    {
                        tcs.TrySetException(ex);
                    }
                }));
                return tcs.Task;
            }

            return CallJsFunctionInternal(functionName, args);
        }

        private static async Task<string> CallJsFunctionInternal(string functionName, params object[] args)
        {
            // serialise shit
            string argList = string.Join(", ", args.Select(a =>
                System.Text.Json.JsonSerializer.Serialize(a)
            ));

            string script = $"{functionName}({argList});";

            try
            {
                string rawResult = await webView.CoreWebView2.ExecuteScriptAsync(script);
                return rawResult;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[JS ERROR] " + ex.Message);
                return null;
            }
        }



        private async Task ListenForUrisAsync()
        {
            while (true)
            {
                try
                {
                    using (var pipe = new NamedPipeServerStream("MySuperSickAppPipeForDCTS", PipeDirection.In))
                    using (var reader = new StreamReader(pipe))
                    {
                        await pipe.WaitForConnectionAsync();

                        string uri = await reader.ReadLineAsync();
                        if (!string.IsNullOrWhiteSpace(uri))
                        {
                            BeginInvoke(new Action(() =>
                            {
                                try
                                {
                                    URIHelper.HandleCustomUri(uri);
                                }
                                catch (Exception ex)
                                {
                                    Logger.Log(ex.Message);
                                    Debug.WriteLine("URI handling failed: " + ex.Message);
                                }
                            }));
                        }
                    }
                }
                catch (Exception ex)
                {
                    Logger.Log(ex.Message);
                    Debug.WriteLine("Pipe error: " + ex.Message);
                    await Task.Delay(1000);
                }
            }
        }

        async void InitializeAsync()
        {
            string userDataDir = Path.Combine(Form1.appPath, "webview-data");
            Directory.CreateDirectory(userDataDir);

            var options = new CoreWebView2EnvironmentOptions(
                "--enable-features=WebRTCHwEncoding " +
                "--autoplay-policy=no-user-gesture-required " +
                "--disable-background-timer-throttling " +
                "--disable-renderer-backgrounding " +
                "--disable-backgrounding-occluded-windows " +
                "--disable-features=CalculateNativeWinOcclusion,StopNonTimersInBackground,StopAllInBackground," +
                "ThrottleDisplayNoneAndVisibilityHiddenCrossOriginIframes,ComputePressure,BackForwardCache"
            );

            var env = await CoreWebView2Environment.CreateAsync(
                null,
                userDataDir,
                options
            );
            await webView.EnsureCoreWebView2Async(env);

            // nice
            webView.CoreWebView2.Profile.PreferredColorScheme = CoreWebView2PreferredColorScheme.Dark;

            await webView.CoreWebView2.Profile.SetPermissionStateAsync(CoreWebView2PermissionKind.Microphone, "http://localhost:2051", CoreWebView2PermissionState.Allow);
            await webView.CoreWebView2.Profile.SetPermissionStateAsync(CoreWebView2PermissionKind.Camera, "http://localhost:2051", CoreWebView2PermissionState.Allow);
            await webView.CoreWebView2.Profile.SetPermissionStateAsync(CoreWebView2PermissionKind.Autoplay, "http://localhost:2051", CoreWebView2PermissionState.Allow);

            webView.CoreWebView2.PermissionRequested += (sender, args) =>
            {
                Debug.WriteLine(sender);
                Debug.WriteLine(args.PermissionKind);
                Debug.WriteLine(args.PermissionKind);
                args.State = CoreWebView2PermissionState.Allow;
            };


            webView.CoreWebView2.Settings.AreHostObjectsAllowed = true;
            webView.CoreWebView2.AddHostObjectToScript("dcts", bridge);
            webView.CoreWebView2.DOMContentLoaded += (s, e) =>
            {
                try
                {
                    if (webView?.CoreWebView2 != null)
                        webView.CoreWebView2.AddHostObjectToScript("dcts", bridge);
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("Host rebind failed: " + ex.Message);
                }
            };

            webView.CoreWebView2.FrameCreated += (sender, args) =>
            {
                try
                {
                    args.Frame.AddHostObjectToScript("dcts", bridge, new[] { "*" });
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("Frame rebind failed: " + ex.Message);
                }
            };


            webView.CoreWebView2.NavigationCompleted += WebView_NavigationCompleted;

            await webView.CoreWebView2.Profile.ClearBrowsingDataAsync(
                CoreWebView2BrowsingDataKinds.CacheStorage & ~CoreWebView2BrowsingDataKinds.Cookies
            );

            NavigateHome();
        }

        public void NavigateHome()
        {
            string indexPath = Path.Combine(Application.StartupPath, "web", "index.html");
            webView.CoreWebView2.Navigate(indexPath);
            webView.CoreWebView2.AddHostObjectToScript("dcts", bridge);
        }

        private void WebView_NavigationCompleted(object sender, CoreWebView2NavigationCompletedEventArgs e)
        {
            if (!didInit)
            {
                formhelper = this;
                StartFadeIn(this, 10, 0.1);
                didInit = true;
            }

            webView.CoreWebView2.AddHostObjectToScript("dcts", bridge);
        }

        public static void StartFadeIn(Form form, int interval, double fadeStep)
        {
            form.Opacity = 0;
            form.BringToFront();

            fadeTimer = new System.Windows.Forms.Timer();
            fadeTimer.Interval = interval; // milliseconds between steps
            fadeTimer.Tick += (s, e) =>
            {
                if (form.Opacity < 1)
                {
                    form.Opacity += fadeStep;
                }
                else
                {
                    fadeTimer.Stop();
                    fadeTimer.Dispose();
                }

                if (form.Opacity == 1)
                {
                    form.BringToFront();
                }
            };
            fadeTimer.Start();
        }

        public static void StartFadeOut(Form form, int interval, double fadeStep, bool exit = false)
        {
            isFadingOut = true;
            form.Opacity = 1;
            form.BringToFront();

            fadeTimer = new System.Windows.Forms.Timer();
            fadeTimer.Interval = interval; // milliseconds between steps
            fadeTimer.Tick += (s, e) =>
            {
                if (form.Opacity > 0)
                {
                    form.Opacity -= fadeStep;
                }
                else
                {
                    fadeTimer.Stop();
                    fadeTimer.Dispose();
                }

                if (form.Opacity == 0)
                {
                    fadeTimer.Stop();
                    fadeTimer.Dispose();
                    if (exit == true) Application.Exit();
                    isFadingOut = false;
                }
            };
            fadeTimer.Start();
        }

        private void Form1_Load(object sender, EventArgs e)
        {
            if (!Directory.Exists(appPath))
            {
                Directory.CreateDirectory(appPath);
            }

            Logger.Clear();
            EnableDarkTitlebar(this.Handle);

            this.Width = GetWidth(70);
            this.Height = GetHeight(70);
            this.Location = new Point( 
                (GetWidth(100) / 2) - (this.Width / 2),
                (GetHeight(100) / 2) - (this.Height / 2)
            );

            cryptoHelper.EnsureKeyPair();
            Updater.CheckAsync("hackthedev/dcts-client-shipping", GetVersion());
        }

        private void Form1_FormClosing(object sender, FormClosingEventArgs e)
        {
            if (!isFadingOut)
            {
                e.Cancel = true;
                StartFadeOut(this, 10, 0.1, true);
            }
        }
    }
}
