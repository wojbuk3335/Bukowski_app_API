import { useEffect, useState } from "react";

function ZebraBarcodePrinter() {
  const [printer, setPrinter] = useState(null);
  const [barcode, setBarcode] = useState("0000000000000");
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (window.BrowserPrint) {
      window.BrowserPrint.getDefaultDevice("printer",
        (device) => setPrinter(device),
        (err) => setError("Nie znaleziono drukarki: " + err)
      );
    } else {
      setError("Nie załadowano biblioteki BrowserPrint.");
    }
  }, []);

  const handlePrint = () => {
    if (!printer) return alert("Brak drukarki");

    const zpl = `
^XA
^PW600
^LL00
^FO50,50
^BY2,2,80
^BCN,100,Y,N,N
^FD${barcode}^FS
^XZ
    `;

    printer.send(zpl,
      () => setSuccessMessage("Wysłano kod kreskowy do drukarki!"),
      (err) => alert("Błąd drukowania: " + err)
    );
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h2>Drukuj kod kreskowy</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

      <input
        type="text"
        value={barcode}
        onChange={(e) => setBarcode(e.target.value)}
        maxLength={13}
        placeholder="Wpisz 13-cyfrowy kod EAN"
        style={{ fontSize: "1.2rem", padding: "0.5rem", width: "300px" }}
      />

      <br /><br />
      <button
        onClick={handlePrint}
        style={{ padding: "0.5rem 1rem", fontSize: "1rem" }}
      >
        Drukuj etykietę z kodem
      </button>
    </div>
  );
}

export default ZebraBarcodePrinter;