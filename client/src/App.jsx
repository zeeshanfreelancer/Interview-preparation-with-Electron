import { useEffect, useState } from "react";
import LanguageTabs from "./components/LanguageTabs";
import UpdateBanner from "./components/UpdateBanner";
import LicenseScreen from "./components/LicenseScreen";
import { getLicenseStatus, isElectron } from "./utils/electron";

function App() {
  const [licenseState, setLicenseState] = useState({ loading: true, status: "licensed" });

  useEffect(() => {
    if (!isElectron()) {
      setLicenseState({ loading: false, status: "licensed" });
      return;
    }

    getLicenseStatus()
      .then((result) => {
        setLicenseState({ loading: false, ...result });
      })
      .catch(() => {
        setLicenseState({ loading: false, status: "unlicensed" });
      });
  }, []);

  useEffect(() => {
    if (!isElectron() || licenseState.status !== "licensed") return undefined;

    const checkExpiry = () => {
      getLicenseStatus().then((result) => {
        if (result.status !== "licensed") {
          setLicenseState({ loading: false, ...result });
        }
      });
    };

    const interval = setInterval(checkExpiry, 60_000);
    return () => clearInterval(interval);
  }, [licenseState.status]);

  if (licenseState.loading) {
    return (
      <div className="min-h-screen bg-blue-100 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (licenseState.status !== "licensed") {
    return (
      <LicenseScreen
        status={licenseState.status}
        expiresLabel={licenseState.expiresLabel}
        onActivated={() => {
          getLicenseStatus().then((result) => {
            setLicenseState({ loading: false, ...result });
          });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-blue-100">
      <LanguageTabs licenseState={licenseState} />
      <UpdateBanner />
    </div>
  );
}

export default App;
