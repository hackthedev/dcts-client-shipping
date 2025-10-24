using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using ModLoader;

namespace DCTS.Classes
{
    public class StorageHelper
    {
        public static StorageHelper instance { get; private set; }

        public static string settingsDataPath = Path.Combine(Form1.appPath, "settings.json");
        private static bool settingsDidInit = false;

        public StorageHelper()
        {
            instance = this;
        }

        public class AppSettings
        {
            public string SavedServers { get; set; } = "{}";
            public string UriScheme { get; set; } = "dcts";
            public string SkippedVersion { get; set; } = "";
        }
        public class ServerInfo
        {
            public string Address { get; set; }
            public string JsonData { get; set; }
            public bool IsFavourite { get; set; }
        }






        public static AppSettings Current { get; private set; } = new AppSettings();

        public static void InitSettings()
        {
            Directory.CreateDirectory(Path.GetDirectoryName(settingsDataPath)!);

            if (!File.Exists(settingsDataPath))
            {
                SaveSettings(); // create file with defaults
            }
            else
            {
                LoadSettings();
            }

            settingsDidInit = true;
        }

        public static void SaveSettings()
        {
            if (!settingsDidInit) InitSettings();
            string json = JsonSerializer.Serialize(Current, new JsonSerializerOptions { WriteIndented = true });
            File.WriteAllText(settingsDataPath, json);
        }

        public static void LoadSettings()
        {
            if (!File.Exists(settingsDataPath))
            {
                Current = new AppSettings();
                SaveSettings();
                return;
            }

            try
            {
                string json = File.ReadAllText(settingsDataPath);
                Current = JsonSerializer.Deserialize<AppSettings>(json) ?? new AppSettings();
            }
            catch
            {
                Current = new AppSettings();
                SaveSettings();
            }
        }

        public static T GetSetting<T>(string settingName)
        {
            if (!settingsDidInit) InitSettings();
            var prop = typeof(AppSettings).GetProperty(settingName);
            if (prop == null) return default!;
            object value = prop.GetValue(Current)!;
            return (T)Convert.ChangeType(value, typeof(T));
        }


        public static void SetSetting(string settingName, string value)
        {
            if (!settingsDidInit) InitSettings();
            var prop = typeof(AppSettings).GetProperty(settingName);
            if (prop != null && prop.CanWrite)
            {
                prop.SetValue(Current, value);
                SaveSettings();
            }
        }


        public Dictionary<string, ServerInfo> GetServers()
        {
            var json = GetSetting<string>("SavedServers");

            if (!string.IsNullOrWhiteSpace(json))
            {
                try { return JsonSerializer.Deserialize<Dictionary<string, ServerInfo>>(json); }
                catch { return new(); }
            }

            return null;
        }

        public void SaveServers(Dictionary<string, ServerInfo> serverInfo)
        {
            SetSetting("SavedServers", JsonSerializer.Serialize(serverInfo));
            SaveSettings();
        }
        public void ResetServers()
        {
            DialogResult dr = MessageBox.Show("Hey are you sure you want to delete all your saved servers ?!",
                "DCTS", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);

            if (dr == DialogResult.Yes)
            {
                SetSetting("SavedServers", "{}");
                SaveSettings();
            }
        }

        public bool SaveServer(string address, string jsonData, bool isFav = false)
        {
            try
            {
                Dictionary<string, ServerInfo> SavedServers = GetServers();

                // we dont check if it exists, we overwrite it.
                SavedServers[address] = new ServerInfo
                {
                    Address = address,
                    JsonData = jsonData,
                    IsFavourite = isFav
                };

                SaveServers(SavedServers);

                return true;
            }
            catch (Exception ex)
            {
                Debug.WriteLine(ex.Message);

                return false;
            }
        }

        public ServerInfo GetServer(string address)
        {
            Dictionary<string, ServerInfo> SavedServers = GetServers();
            if (SavedServers.ContainsKey(address))
            {
                return SavedServers[address];
            }
            return null;
        }

        public void DeleteServer(string address)
        {
            Dictionary<string, ServerInfo> SavedServers = GetServers();

            if (SavedServers.ContainsKey(address))
            {
                SavedServers.Remove(address);
            }

            SaveServers(SavedServers);
        }
    }
}
