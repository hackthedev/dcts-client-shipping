using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace DCTS
{
    public class DCTSHelper
    {
        public static DCTSHelper instance { get; private set; }
        public DCTSHelper()
        {
            instance = this;
        }

        public async Task<JsonDocument?> CheckServerAsync(string address)
        {
            try
            {
                using var client = new HttpClient();
                var random = new Random().Next(0, 1_000_000);
                var url = $"http://{address}/discover?ran={random}";

                var response = await client.GetAsync(url);
                if (!response.IsSuccessStatusCode)
                    return null;

                var json = await response.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);

                if (doc.RootElement.TryGetProperty("serverinfo", out _))
                    return JsonDocument.Parse(json);

                return null;
            }
            catch
            {
                return null;
            }
        }

        public bool PingHost(string address)
        {
            try
            {
                string host = address;
                int port = -1;

                if (address.Contains(":"))
                {
                    var parts = address.Split(':');
                    host = parts[0];
                    int.TryParse(parts[1], out port);
                }

                if (port > 0)
                {
                    using var client = new TcpClient();
                    var result = client.BeginConnect(host, port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(2000);

                    if (!success)
                        return false;

                    client.EndConnect(result);
                    return true;
                }
                else
                {
                    using var pinger = new Ping();
                    var reply = pinger.Send(host, 2000);
                    return reply.Status == IPStatus.Success;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine(ex.Message);
                return false;
            }
        }
    }
}
