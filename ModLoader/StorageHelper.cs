using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace ModLoader
{
    public  class StorageHelper
    {
        public static StorageHelper instance { get; private set; }
        public StorageHelper()
        {
            instance = this;
        }

        public class ServerInfo
        {
            public string Address { get; set; }
            public string JsonData { get; set; }
            public bool IsFavourite { get; set; }
        }


        public Dictionary<string, ServerInfo> GetServers()
        {
            var json = DCTS.Properties.Settings.Default.storedServers;

            if (!string.IsNullOrWhiteSpace(json))
            {
                try { return JsonSerializer.Deserialize<Dictionary<string, ServerInfo>>(json); }
                catch { return new(); }
            }

            return null;
        }

        public void SaveServers(Dictionary<string, ServerInfo> serverInfo) 
        {
            DCTS.Properties.Settings.Default.storedServers = JsonSerializer.Serialize<Dictionary<string, ServerInfo>>(serverInfo);
            DCTS.Properties.Settings.Default.Save();
            DCTS.Properties.Settings.Default.Reload();
        }
        public void ResetServers()
        {
            DialogResult dr = MessageBox.Show("Hey are you sure you want to delete all your saved servers ?!", 
                "DCTS", MessageBoxButtons.YesNo, MessageBoxIcon.Warning);

            if (dr == DialogResult.Yes)
            {
                DCTS.Properties.Settings.Default.storedServers = "{}";
                DCTS.Properties.Settings.Default.Save();
                DCTS.Properties.Settings.Default.Reload();
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
            catch (Exception ex) { 
                Debug.WriteLine(ex.Message);

                return false;
            }
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
