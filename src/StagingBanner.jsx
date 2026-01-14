export default function StagingBanner() {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      padding: '0.5rem',
      backgroundColor: 'red',
      color: 'white',
      fontWeight: 'bold',
      textAlign: 'center',
      zIndex: 9999
    }}>
      STAGING BUILD
    </div>
  );
}
