using ModLoader;
using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Threading.Tasks;
using System.Windows.Forms;

namespace DCTS
{
    public static class Updater
    {
        public static async Task CheckAsync(string repo, string currentVersion)
        {
            using var client = new WebClient();

            try
            {
                string remoteUrl = $"https://github.com/{repo}/releases/latest/download/version.txt";
                string remoteVersion = await client.DownloadStringTaskAsync(remoteUrl);

                remoteVersion = remoteVersion.Trim();

                if (remoteVersion == currentVersion)
                    return;

                // return if we skipped this version
                if (StorageHelper.GetSetting<string>("SkippedVersion").Length > 0)
                {
                    if (remoteVersion == StorageHelper.GetSetting<string>("SkippedVersion"))
                    {
                        return;
                    }
                }

                DialogResult result = MessageBox.Show(
                    $"A new update is available ({remoteVersion}) \nDo you want to download it?",
                    "DCTS",
                    MessageBoxButtons.YesNo,
                    MessageBoxIcon.Information
                );

                if (result != DialogResult.Yes)
                {
                    DialogResult skipVersion = MessageBox.Show(
                       $"Do you want to skip this version? ({remoteVersion})",
                       "DCTS",
                       MessageBoxButtons.YesNo,
                       MessageBoxIcon.Information
                    );

                    // option to skip version
                    if (skipVersion == DialogResult.Yes)
                    {
                        StorageHelper.SetSetting("SkippedVersion", remoteVersion);
                        StorageHelper.SaveSettings();
                    }

                    return;
                }


                UpdateForm updater = new UpdateForm();
                updater.Show();

                string zipPath = Path.Combine(Application.StartupPath, "update.zip");
                string downloadUrl = $"https://github.com/{repo}/releases/latest/download/update.zip";

                await client.DownloadFileTaskAsync(downloadUrl, zipPath);

                if (File.Exists(zipPath))
                {
                    updater.Close();

                    string bat = Path.Combine(Application.StartupPath, "unzip.bat");
                    var psi = new ProcessStartInfo("cmd.exe", $"/c \"{bat}\"")
                    {
                        UseShellExecute = false,
                        CreateNoWindow = true,
                        WindowStyle = ProcessWindowStyle.Hidden
                    };

                    Process.Start(psi);

                    Application.Exit();
                }
            }
            catch (Exception ex)
            {
                Clipboard.SetText(ex.Message);
                MessageBox.Show($"Unable to update client:\n{ex.Message}", "DCTS", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }
    }
}
