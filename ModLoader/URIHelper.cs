using DCTS;
using Microsoft.Win32;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Linq;
using System.Net.NetworkInformation;
using System.Reflection;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Web;

namespace ModLoader
{
    public class URIHelper
    {
        public static URIHelper instance { get; private set; }
        public URIHelper()
        {
            instance = this;
        }


        public static async void HandleCustomUri(string uri)
        {
            string baseUri = $@"{DCTS.Properties.Settings.Default.uriScheme}://";

            // if ends with slash remove it
            if(uri.Last() == '/')
            {
                uri = uri.Substring(0, uri.Length-1);
            }

            if (uri.StartsWith(baseUri))
            {
                if (uri == $"{baseUri}version")
                {
                    MessageBox.Show(
                        Form1.formhelper.GetVersion(),
                        "DCTS",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information
                    );
                }
                if (uri.Contains($"{baseUri}join/"))
                {
                    string serverAddress = uri.Split('/').Last();
                    bool hostIsAvailable = Form1.dctsHelper.PingHost($"{serverAddress}");

                    if (hostIsAvailable)
                    {
                        // if its valid store the server hehe
                        var json = await Form1.dctsHelper.CheckServerAsync(serverAddress);
                        if (json != null)
                        {
                            Form1.storage.SaveServer(serverAddress, JsonSerializer.Serialize(json));
                        }
                        
                    }

                    // actually connect to the server too
                    Form1.bridge.NavigateToUrl(serverAddress);
                }
            }
            else
            {
                MessageBox.Show("Unknown URI: " + uri);
            }
        }

        static void RestartAsAdmin()
        {
            var exeName = Application.ExecutablePath;
            var psi = new ProcessStartInfo(exeName)
            {
                UseShellExecute = true,
                Verb = "runas" // triggers UAC
            };

            try
            {
                Process.Start(psi);
            }
            catch
            {
                MessageBox.Show("Unable to get admin rights");
            }

            Application.Exit(); // stop current instance
        }

        public static bool IsRunAsAdmin()
        {
            using (WindowsIdentity identity = WindowsIdentity.GetCurrent())
            {
                WindowsPrincipal principal = new WindowsPrincipal(identity);
                return principal.IsInRole(WindowsBuiltInRole.Administrator);
            }
        }

        public static bool IsUriSchemeRegistered(string schemeName)
        {
            using (RegistryKey key = Registry.ClassesRoot.OpenSubKey(schemeName))
            {
                return key != null;
            }
        }

        public static void RegisterUriScheme()
        {
            if (IsUriSchemeRegistered(DCTS.Properties.Settings.Default.uriScheme))
            {
                Logger.Log("URI is registered");
                return;
            }

            bool isRunAsAdmin = IsRunAsAdmin();
            if (!IsUriSchemeRegistered(DCTS.Properties.Settings.Default.uriScheme)) {

                Logger.Log("URI is not registered");

                if (!isRunAsAdmin)
                {
                    Logger.Log("Prompting for admin permissions..");

                    MessageBox.Show(
                        "To handle custom URLs the application needs to be run as admin :/\n\nClick OK to restart",
                        "DCTS",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning
                    );

                    Logger.Log("Restarting as admin..");
                    RestartAsAdmin();

                    return;
                }
               
            }

            string schemeName = DCTS.Properties.Settings.Default.uriScheme;
            string exePath = Application.ExecutablePath;

            Logger.Log("Setting URL Protocol");
            Logger.Log($"Scheme Name: {schemeName}");
            Logger.Log($"Exe Path: {exePath}");

            RegistryKey key = Registry.ClassesRoot.CreateSubKey(schemeName);
            key.SetValue("", $"URL:{DCTS.Properties.Settings.Default.uriScheme}");
            key.SetValue("URL Protocol", "");

            RegistryKey defaultIcon = key.CreateSubKey("DefaultIcon");
            defaultIcon.SetValue("", $"\"{exePath}\",1");

            RegistryKey shell = key.CreateSubKey(@"shell\open\command");
            shell.SetValue("", $"\"{exePath}\" \"%1\"");

            Logger.Log($"Registered URL Protocol");
        }

        public static string GetQueryParam(string uri, string key)
        {
            if (string.IsNullOrEmpty(uri) || string.IsNullOrEmpty(key)) return null;

            try
            {
                var queryStart = uri.IndexOf('?');
                if (queryStart == -1) return null;

                var query = uri.Substring(queryStart + 1);
                var parsed = HttpUtility.ParseQueryString(query);

                return parsed.Get(key);
            }
            catch
            {
                return null;
            }
        }
    }
}
