import { useEffect, useState } from "react"
import { baseUrl } from "../utils/constants";
import type { GeneralSettings } from "../types/types";

export const useGeneralSettings = () => {
    const [settings, setSettings] = useState<GeneralSettings | null>(null);
    const [loader, setLoader] = useState(true);

    useEffect(() => {
      const fetchGeneralSettings = async () => {
        try {
            const res = await fetch(baseUrl + "/admin/settings", {
                credentials: "include"
            });

            const data = await res.json();
            setSettings(data.data?.[0]);
        } catch (e) {
            console.log(e);
        } finally {
            setLoader(false)
        }
      } 

      fetchGeneralSettings();
    }, []);

    return {
        settings,
        loader
    }
}