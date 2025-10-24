using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace DCTS.Classes
{
    public class Logger
    {
        public static string logPath = Path.Combine(Application.StartupPath, "log.txt");
        public static void Log(string content)
        {
            if (!File.Exists(logPath)) File.WriteAllText(logPath, "");

            File.AppendAllText(logPath, content + Environment.NewLine);
        }

        public static void Clear()
        {
            if (File.Exists(logPath))
            {
                try
                {
                    long size = new FileInfo(logPath).Length / 1024 / 1024;

                    if (size > 50)
                    {
                        File.WriteAllText(logPath, "");
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("Cant clear log file");
                    Debug.WriteLine(ex.Message);
                }
            }
        }
    }
}
