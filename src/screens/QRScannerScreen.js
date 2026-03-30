import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Modal, Linking, ScrollView } from 'react-native';
import { Camera, useCameraDevice, useCodeScanner } from 'react-native-vision-camera';
import { analyzeURL } from '../services/urlScanner';
import { getRiskColor, getRiskEmoji } from '../services/scamDetector';

const QRScannerScreen = ({ navigation }) => {
  const device = useCameraDevice('back');
  const [active, setActive] = useState(true);
  const [result, setResult] = useState(null);
  const [scanning, setScanning] = useState(false);

  const codeScanner = useCodeScanner({
    codeTypes: ['qr', 'ean-13'],
    onCodeScanned: (codes) => {
      if (codes.length > 0 && !scanning) {
        setScanning(true);
        handleScan(codes[0].value);
      }
    }
  });

  const handleScan = async (data) => {
    setActive(false);
    const analysis = await analyzeURL(data);
    setResult(analysis);
  };

  const resetScanner = () => {
    setResult(null);
    setScanning(false);
    setActive(true);
  };

  if (device == null) return <View style={styles.container}><Text>No Camera Device Found</Text></View>;

  return (
    <View style={styles.container}>
      {active && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={active}
          codeScanner={codeScanner}
        />
      )}

      {/* Overlay */}
      <View style={styles.overlay}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ fontSize: 24, color: '#FFF' }}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Safe QR Scanner</Text>
        </View>
        <View style={styles.scannerFrame} />
        <Text style={styles.hint}>Point at a QR code to verify its safety</Text>
      </View>

      {/* Analysis Result Modal */}
      <Modal visible={!!result} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={[styles.statusHeader, { backgroundColor: getRiskColor(result?.risk) }]}>
              <Text style={styles.statusEmoji}>{getRiskEmoji(result?.risk)}</Text>
              <Text style={styles.statusText}>{result?.risk?.toUpperCase()} RISK</Text>
            </View>

            <ScrollView style={styles.detailsArea}>
              <Text style={styles.urlLabel}>Scanned Domain:</Text>
              <Text style={styles.urlValue}>{result?.domain}</Text>

              {result?.redFlags?.length > 0 && (
                <View style={styles.flagSection}>
                  <Text style={styles.flagHeader}>Red Flags Detected:</Text>
                  {result.redFlags.map((flag, i) => (
                    <View key={i} style={styles.flagItem}>
                      <Text style={{ fontSize: 16, marginRight: 8 }}>⚠️</Text>
                      <Text style={styles.flagText}>{flag}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.adviceText}>
                {result?.risk === 'high' 
                  ? "DANGER: This link is likely a phishing scam. Close it immediately." 
                  : result?.risk === 'medium'
                  ? "WARNING: This link looks suspicious. Open with extreme caution."
                  : "SAFE: No immediate threats detected."}
              </Text>
            </ScrollView>

            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.resetBtn} onPress={resetScanner}>
                <Text style={styles.resetBtnText}>Rescan</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.openBtn, { opacity: result?.risk === 'high' ? 0.5 : 1 }]} 
                onPress={() => result?.risk !== 'high' && Linking.openURL(result.finalUrl)}
              >
                <Text style={styles.openBtnText}>Open Link Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginTop: 40 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 15 },
  scannerFrame: { alignSelf: 'center', width: 250, height: 250, borderStyle: 'dashed', borderWidth: 2, borderColor: '#FFF', borderRadius: 20 },
  hint: { color: '#FFF', textAlign: 'center', marginBottom: 100, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  statusHeader: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 20 },
  statusEmoji: { fontSize: 24, marginRight: 10 },
  statusText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
  detailsArea: { marginBottom: 20 },
  urlLabel: { fontSize: 12, color: '#64748B', marginBottom: 4 },
  urlValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 16 },
  flagSection: { marginBottom: 16 },
  flagHeader: { fontSize: 14, fontWeight: 'bold', color: '#E11D48', marginBottom: 8 },
  flagItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  flagText: { fontSize: 14, color: '#334155', marginLeft: 8 },
  adviceText: { fontSize: 15, lineHeight: 22, color: '#475569', backgroundColor: '#F8FAFC', padding: 12, borderRadius: 8 },
  actionButtons: { flexDirection: 'row', gap: 12 },
  resetBtn: { flex: 1, backgroundColor: '#F1F5F9', padding: 16, borderRadius: 12, alignItems: 'center' },
  resetBtnText: { color: '#475569', fontWeight: 'bold' },
  openBtn: { flex: 2, backgroundColor: '#1E293B', padding: 16, borderRadius: 12, alignItems: 'center' },
  openBtnText: { color: '#FFF', fontWeight: 'bold' },
});

export default QRScannerScreen;
