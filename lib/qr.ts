import QRCode from 'qrcode';

export async function generateQRCode(value: string): Promise<string> {
  return await QRCode.toDataURL(value, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    margin: 1,
    color: { dark: '#0F172A', light: '#FFFFFF' },
    width: 300,
  });
}

export function formatQRValue(type: 'FAC' | 'STF' | 'STD', number: string): string {
  return `SV8CNHS-${type}-${number.padStart(6, '0')}`;
}
