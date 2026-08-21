import { useState, useEffect } from 'react';
import {
  User,
  UploadCloud, Truck, Caravan, ShieldAlert, Check, CheckCircle2,
  XCircle, CheckCircle, AlertTriangle
} from 'lucide-react';
import Toast from '../components/Toast';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.port !== '5173' && window.location.port !== '5174') {
      return '/api';
    }
  }
  return 'http://172.22.200.17:8013/api';
};

const API_BASE_URL = getApiBaseUrl();

export default function ConductorPage() {
  const [disclaimerAceptado, setDisclaimerAceptado] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [docFaltanteError, setDocFaltanteError] = useState('');

  // Lista de empresas para autocompletado
  const [empresasLista, setEmpresasLista] = useState([]);
  const [sugerenciasEmpresa, setSugerenciasEmpresa] = useState([]);
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false);

  // Datos formulario Conductor
  const [formData, setFormData] = useState({
    dni: '',
    nombre: '',
    apellido: '',
    telefono: '',
    empresa: '',
    destino: '',
    notas: '',
    matricula_vehiculo: '',
    lleva_remolque: false,
    matricula_remolque: ''
  });

  // Archivos Conductor
  const [carnetFile, setCarnetFile] = useState(null);
  const [capFile, setCapFile] = useState(null);

  // Archivos Vehículo Tractor
  const [permisoVehiculo, setPermisoVehiculo] = useState(null);
  const [itvVehiculo, setItvVehiculo] = useState(null);
  const [seguroVehiculo, setSeguroVehiculo] = useState(null);
  const [tarjetaVehiculo, setTarjetaVehiculo] = useState(null);

  // Archivos Remolque
  const [permisoRemolque, setPermisoRemolque] = useState(null);
  const [itvRemolque, setItvRemolque] = useState(null);
  const [seguroRemolque, setSeguroRemolque] = useState(null);
  const [tarjetaRemolque, setTarjetaRemolque] = useState(null);

  // Estados de verificación de documentos registrados en BD
  const [infoPersonaBD, setInfoPersonaBD] = useState({ verificado: false, existe: false, documentos: [] });
  const [infoVehiculoBD, setInfoVehiculoBD] = useState({ verificado: false, existe: false, documentos: [] });
  const [infoRemolqueBD, setInfoRemolqueBD] = useState({ verificado: false, existe: false, documentos: [] });

  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  useEffect(() => {
    fetchEmpresas();
  }, []);

  const fetchEmpresas = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/empresas`);
      const data = await res.json();
      if (data.success && data.empresas) {
        setEmpresasLista(data.empresas);
      }
    } catch (e) {
      console.error('Error cargando empresas:', e);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setDocFaltanteError('');

    if (name === 'matricula_vehiculo' || name === 'matricula_remolque') {
      const matClean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      setFormData(prev => ({ ...prev, [name]: matClean }));

      if (name === 'matricula_vehiculo' && matClean.length >= 5) {
        verificarVehiculoBD(matClean);
      }
      if (name === 'matricula_remolque' && matClean.length >= 5) {
        verificarRemolqueBD(matClean);
      }
      return;
    }

    if (name === 'dni') {
      setFormData(prev => ({ ...prev, dni: value }));
      if (value.trim().length >= 7) {
        verificarPersonaBD(value.trim());
      }
      return;
    }

    if (name === 'empresa') {
      setFormData(prev => ({ ...prev, empresa: value }));
      if (value.trim().length >= 1) {
        const filtradas = empresasLista.filter(emp =>
          emp.nombre.toLowerCase().includes(value.trim().toLowerCase())
        );
        setSugerenciasEmpresa(filtradas);
        setShowEmpresaDropdown(true);
      } else {
        setSugerenciasEmpresa([]);
        setShowEmpresaDropdown(false);
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSelectEmpresa = (nombreEmpresa) => {
    setFormData(prev => ({ ...prev, empresa: nombreEmpresa }));
    setShowEmpresaDropdown(false);
  };

  const verificarPersonaBD = async (dniVal) => {
    const dniClean = (dniVal || formData.dni).trim();
    if (!dniClean) return;

    try {
      const res = await fetch(`${API_BASE_URL}/personas/verificar?dni=${encodeURIComponent(dniClean)}`);
      const data = await res.json();

      if (data.existe) {
        setInfoPersonaBD({
          verificado: true,
          existe: true,
          documentos: data.documentos_estado || []
        });

        if (data.persona) {
          setFormData(prev => ({
            ...prev,
            nombre: pVal(data.persona.nombre, prev.nombre),
            apellido: pVal(data.persona.apellido, prev.apellido),
            telefono: pVal(data.persona.telefono, prev.telefono),
            empresa: pVal(data.persona.empresa_nombre, prev.empresa)
          }));
        }
      } else {
        setInfoPersonaBD({
          verificado: true,
          existe: false,
          documentos: [
            { nombre: 'Permiso de Conducir', existe: false },
            { nombre: 'CAP', existe: false }
          ]
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const pVal = (valBD, valActual) => (valBD && valBD.trim()) ? valBD : valActual;

  const verificarVehiculoBD = async (matVal) => {
    const matClean = (matVal || formData.matricula_vehiculo).trim();
    if (!matClean) return;

    try {
      const res = await fetch(`${API_BASE_URL}/vehiculos/verificar?matricula=${encodeURIComponent(matClean)}`);
      const data = await res.json();

      setInfoVehiculoBD({
        verificado: true,
        existe: data.existe,
        documentos: data.documentos_estado || []
      });

      if (data.existe && data.vehiculo && data.vehiculo.empresa_nombre) {
        setFormData(prev => ({
          ...prev,
          empresa: prev.empresa || data.vehiculo.empresa_nombre
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const verificarRemolqueBD = async (matVal) => {
    const matClean = (matVal || formData.matricula_remolque).trim();
    if (!matClean) return;

    try {
      const res = await fetch(`${API_BASE_URL}/remolques/verificar?matricula=${encodeURIComponent(matClean)}`);
      const data = await res.json();

      setInfoRemolqueBD({
        verificado: true,
        existe: data.existe,
        documentos: data.documentos_estado || []
      });
    } catch (e) {
      console.error(e);
    }
  };

  // Helper para verificar si un documento existe en BD o fue seleccionado para subir ahora
  const tieneDocumento = (docNombre, infoBD, archivoSeleccionado) => {
    if (archivoSeleccionado) return true;
    const match = infoBD.documentos.find(d => d.nombre.toLowerCase() === docNombre.toLowerCase());
    return match ? match.existe : false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setDocFaltanteError('');

    if (!formData.dni || !formData.nombre || !formData.apellido) {
      showToast('Tu DNI, Nombre y Apellidos son obligatorios (*)', 'error');
      return;
    }

    if (!formData.matricula_vehiculo) {
      showToast('La matrícula del vehículo es obligatoria (*)', 'error');
      return;
    }

    // ── VERIFICAR OBLIGATORIEDAD DE TODOS LOS ARCHIVOS ──
    const faltaCarnet = !tieneDocumento('Permiso de Conducir', infoPersonaBD, carnetFile);
    const faltaCap = !tieneDocumento('CAP', infoPersonaBD, capFile);

    const faltaItvVehiculo = !tieneDocumento('ITV', infoVehiculoBD, itvVehiculo);
    const faltaSeguroVehiculo = !tieneDocumento('Seguro', infoVehiculoBD, seguroVehiculo);
    const faltaPermisoVehiculo = !tieneDocumento('Permiso de Circulación', infoVehiculoBD, permisoVehiculo);
    const faltaTarjetaVehiculo = !tieneDocumento('Tarjeta de Transporte', infoVehiculoBD, tarjetaVehiculo);

    let faltaRemolque = false;
    if (formData.lleva_remolque && formData.matricula_remolque) {
      const faltaItvRem = !tieneDocumento('ITV', infoRemolqueBD, itvRemolque);
      const faltaSegRem = !tieneDocumento('Seguro', infoRemolqueBD, seguroRemolque);
      const faltaPermRem = !tieneDocumento('Permiso de Circulación', infoRemolqueBD, permisoRemolque);
      const faltaTarjRem = !tieneDocumento('Tarjeta de Transporte', infoRemolqueBD, tarjetaRemolque);
      faltaRemolque = faltaItvRem || faltaSegRem || faltaPermRem || faltaTarjRem;
    }

    if (faltaCarnet || faltaCap || faltaItvVehiculo || faltaSeguroVehiculo || faltaPermisoVehiculo || faltaTarjetaVehiculo || faltaRemolque) {
      const msgError = 'Documentación faltante. Consulte en recepción';
      setDocFaltanteError(msgError);
      showToast(msgError, 'error');
      return;
    }

    setIsSubmitting(true);
    showToast('Enviando datos y documentación...', 'info');

    try {
      // 1. Guardar/Actualizar Conductor y generar entrada
      const payloadPersona = new FormData();
      payloadPersona.append('dni', formData.dni);
      payloadPersona.append('nombre', formData.nombre);
      payloadPersona.append('apellido', formData.apellido);
      payloadPersona.append('telefono', formData.telefono);
      payloadPersona.append('empresa', formData.empresa);
      payloadPersona.append('destino', formData.destino);
      payloadPersona.append('notas', formData.notas);

      if (carnetFile) payloadPersona.append('file_permiso', carnetFile);
      if (capFile) payloadPersona.append('file_cap', capFile);

      const resPersona = await fetch(`${API_BASE_URL}/entradas/persona`, {
        method: 'POST',
        body: payloadPersona
      });
      const dataPersona = await resPersona.json();

      if (!dataPersona.success) {
        showToast(dataPersona.error || 'Error al procesar la identificación', 'error');
        setIsSubmitting(false);
        return;
      }

      const personaId = dataPersona.persona_id;

      // 2. Guardar datos y documentos del Vehículo Tractor
      if (formData.matricula_vehiculo) {
        const payloadVehiculo = new FormData();
        payloadVehiculo.append('matricula', formData.matricula_vehiculo);
        payloadVehiculo.append('empresa', formData.empresa);
        payloadVehiculo.append('id_persona', personaId);
        payloadVehiculo.append('notas', formData.notas);

        if (permisoVehiculo) payloadVehiculo.append('file_permiso', permisoVehiculo);
        if (itvVehiculo) payloadVehiculo.append('file_itv', itvVehiculo);
        if (seguroVehiculo) payloadVehiculo.append('file_seguro', seguroVehiculo);
        if (tarjetaVehiculo) payloadVehiculo.append('file_tarjeta_transporte', tarjetaVehiculo);

        await fetch(`${API_BASE_URL}/entradas/vehiculo`, {
          method: 'POST',
          body: payloadVehiculo
        });
      }

      // 3. Guardar Remolque (si aplica)
      if (formData.lleva_remolque && formData.matricula_remolque) {
        const payloadRemolque = new FormData();
        payloadRemolque.append('matricula', formData.matricula_remolque);
        payloadRemolque.append('empresa', formData.empresa);
        payloadRemolque.append('id_persona', personaId);

        if (permisoRemolque) payloadRemolque.append('file_permiso', permisoRemolque);
        if (itvRemolque) payloadRemolque.append('file_itv', itvRemolque);
        if (seguroRemolque) payloadRemolque.append('file_seguro', seguroRemolque);
        if (tarjetaRemolque) payloadRemolque.append('file_tarjeta_transporte', tarjetaRemolque);

        await fetch(`${API_BASE_URL}/entradas/remolque`, {
          method: 'POST',
          body: payloadRemolque
        });
      }

      setSubmittedSuccess(true);
    } catch (err) {
      console.error(err);
      showToast('Error de comunicación con el servidor', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingBottom: '40px'
    }}>
      {/* ── MODAL DISCLAIMER INELUDIBLE ── */}
      {!disclaimerAceptado && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '16px',
            maxWidth: '540px',
            width: '100%',
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{
              padding: '16px 20px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid #334155',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <ShieldAlert size={32} color="#ef4444" style={{ flexShrink: 0 }} />
              <div>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '700', color: '#f8fafc' }}>
                  Aviso de Seguridad y Prevención (CAE)
                </h2>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                  Requisito obligatorio antes de acceder al recinto
                </span>
              </div>
            </div>

            <div style={{ padding: '20px', fontSize: '13.5px', lineHeight: '1.6', color: '#cbd5e1' }}>
              <p style={{ fontWeight: '700', marginBottom: '10px', fontSize: '15px', color: '#f8fafc' }}>
                Estimado/a conductor/a:
              </p>
              <p style={{ marginBottom: '12px' }}>
                Para poder autorizar tu acceso a nuestras instalaciones y realizar operaciones de carga o descarga, es requisito legal y obligatorio presentar la documentación vigente de tu vehículo (ITV y Póliza de Seguro) y, en su caso, la acreditación laboral correspondiente.
              </p>
              <p style={{ marginBottom: '12px' }}>
                Entendemos que este trámite puede suponer una pausa en tu ruta, pero queremos ser transparentes sobre por qué te solicitamos esta información:
              </p>
              <ol style={{ paddingLeft: '18px', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>
                  <strong style={{ color: '#f8fafc' }}>Cumplimiento de la Ley:</strong> Según la Ley de Prevención de Riesgos Laborales (art. 24 sobre Coordinación de Actividades Empresariales - CAE), nuestra empresa es legalmente responsable de la seguridad de toda persona que opere dentro de nuestro recinto.
                </li>
                <li>
                  <strong style={{ color: '#f8fafc' }}>Tu seguridad y la de nuestro equipo:</strong> Necesitamos confirmar que todos los vehículos que maniobran en nuestras instalaciones cumplen con los requisitos mecánicos (ITV) para prevenir fallos durante los trabajos de muelle.
                </li>
                <li>
                  <strong style={{ color: '#f8fafc' }}>Cobertura ante incidencias:</strong> En caso de que se produzca cualquier colisión o roce durante las maniobras, la ley nos exige haber verificado previamente que el vehículo cuenta con el seguro obligatorio en vigor.
                </li>
              </ol>

              <div style={{
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                borderLeft: '4px solid #f59e0b',
                padding: '10px 14px',
                borderRadius: '6px',
                marginBottom: '14px',
                fontSize: '12.5px',
                color: '#fbbf24'
              }}>
                <strong>Nota:</strong> Por imperativo legal, nuestro personal tiene orden de denegar el acceso a las zonas de trabajo a cualquier vehículo o conductor que no presente la documentación requerida.
              </div>
              <p style={{ margin: 0, fontStyle: 'italic', color: '#94a3b8', fontSize: '12px' }}>
                Agradecemos sinceramente tu tiempo y tu colaboración para mantener un entorno de trabajo seguro para todos.
              </p>
            </div>

            <div style={{
              padding: '14px 20px',
              borderTop: '1px solid #334155',
              backgroundColor: '#0f172a',
              display: 'flex',
              justify: 'center'
            }}>
              <button
                type="button"
                onClick={() => setDisclaimerAceptado(true)}
                style={{
                  width: '100%',
                  padding: '14px',
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
                }}
              >
                <Check size={20} /> Entendido y Aceptar Condiciones
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── HEADER MOBILE CONDUCTOR ── */}
      <header style={{
        backgroundColor: '#1e293b',
        borderBottom: '1px solid #334155',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '12px',
          backgroundColor: '#3b82f6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <Truck size={24} color="#ffffff" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#f8fafc' }}>
            Registro de Acceso Conductor
          </h1>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            Identificación y Registro de Documentación
          </span>
        </div>
      </header>

      {/* ── PANTALLA DE ÉXITO ── */}
      {submittedSuccess ? (
        <div style={{
          maxWidth: '500px',
          margin: '30px auto',
          padding: '24px',
          backgroundColor: '#1e293b',
          borderRadius: '20px',
          border: '1px solid #334155',
          textAlign: 'center'
        }}>
          <CheckCircle2 size={64} color="#10b981" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: '#f8fafc', marginBottom: '8px' }}>
            ¡Documentación Registrada!
          </h2>
          <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.5', marginBottom: '24px' }}>
            Tus datos y la documentación de tu vehículo se han guardado correctamente en el sistema. Puedes dirigirte a la recepción para proceder a la firma.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmittedSuccess(false);
              setFormData({
                dni: '', nombre: '', apellido: '', telefono: '', empresa: '',
                destino: '', notas: '', matricula_vehiculo: '', lleva_remolque: false, matricula_remolque: ''
              });
              setCarnetFile(null); setCapFile(null); setPermisoVehiculo(null); setItvVehiculo(null); setSeguroVehiculo(null); setTarjetaVehiculo(null); setPermisoRemolque(null); setItvRemolque(null); setSeguroRemolque(null); setTarjetaRemolque(null);
              setInfoPersonaBD({ verificado: false, existe: false, documentos: [] });
              setInfoVehiculoBD({ verificado: false, existe: false, documentos: [] });
              setInfoRemolqueBD({ verificado: false, existe: false, documentos: [] });
              setDocFaltanteError('');
            }}
            style={{
              width: '100%',
              padding: '14px',
              backgroundColor: '#334155',
              color: '#f8fafc',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Registrar Otro Conductor / Vehículo
          </button>
        </div>
      ) : (
        /* ── FORMULARIO PRINCIPAL OPTIMIZADO PARA MÓVIL ── */
        <main style={{ maxWidth: '600px', margin: '0 auto', padding: '16px' }}>

          {/* BANNER ERROR DOCUMENTACIÓN FALTANTE */}
          {docFaltanteError && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.18)',
              border: '2px solid #ef4444',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              boxShadow: '0 8px 20px rgba(239, 68, 68, 0.25)'
            }}>
              <AlertTriangle size={32} color="#f87171" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ display: 'block', fontSize: '16px', color: '#f87171', marginBottom: '2px' }}>
                  Atención / Acceso Denegado
                </strong>
                <span style={{ fontSize: '14px', color: '#fca5a5', fontWeight: '600' }}>
                  {docFaltanteError}
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            {/* SECCIÓN 1: DATOS PERSONALES CONDUCTOR */}
            <section style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={20} /> 1. Datos del Conductor
                </h2>
                {infoPersonaBD.verificado && (
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px',
                    backgroundColor: infoPersonaBD.existe ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: infoPersonaBD.existe ? '#34d399' : '#fbbf24'
                  }}>
                    {infoPersonaBD.existe ? 'Registrado en BD' : 'Nuevo Conductor'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                    DNI / NIE *
                  </label>
                  <input
                    type="text"
                    name="dni"
                    value={formData.dni}
                    onChange={handleInputChange}
                    onBlur={() => verificarPersonaBD()}
                    placeholder="Ej: 12345678Z"
                    autoComplete="off"
                    required
                    style={{
                      width: '100%', minHeight: '48px', padding: '0 14px', borderRadius: '10px',
                      backgroundColor: '#0f172a', border: '1px solid #475569', color: '#f8fafc', fontSize: '16px', boxSizing: 'border-box'
                    }}
                  />

                  {/* Chips de estado de documentos persona */}
                  {infoPersonaBD.verificado && infoPersonaBD.documentos.length > 0 && (
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {infoPersonaBD.documentos.map((doc, idx) => (
                        <span key={idx} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '11.5px', fontWeight: '600', padding: '4px 8px', borderRadius: '6px',
                          backgroundColor: doc.existe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: doc.existe ? '#34d399' : '#f87171',
                          border: `1px solid ${doc.existe ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}>
                          {doc.existe ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {doc.existe ? `${doc.nombre} Entregado` : `Falta ${doc.nombre}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                    Nombre *
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    placeholder="Tu nombre"
                    autoComplete="off"
                    required
                    style={{
                      width: '100%', minHeight: '48px', padding: '0 14px', borderRadius: '10px',
                      backgroundColor: '#0f172a', border: '1px solid #475569', color: '#f8fafc', fontSize: '16px', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    name="apellido"
                    value={formData.apellido}
                    onChange={handleInputChange}
                    placeholder="Tus apellidos"
                    autoComplete="off"
                    required
                    style={{
                      width: '100%', minHeight: '48px', padding: '0 14px', borderRadius: '10px',
                      backgroundColor: '#0f172a', border: '1px solid #475569', color: '#f8fafc', fontSize: '16px', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                    Teléfono Móvil
                  </label>
                  <input
                    type="tel"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    placeholder="600 000 000"
                    autoComplete="off"
                    style={{
                      width: '100%', minHeight: '48px', padding: '0 14px', borderRadius: '10px',
                      backgroundColor: '#0f172a', border: '1px solid #475569', color: '#f8fafc', fontSize: '16px', boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* EMPRESA CON AUTOCOMPLETADO */}
                <div style={{ position: 'relative' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                    Empresa de Transporte
                  </label>
                  <input
                    type="text"
                    name="empresa"
                    value={formData.empresa}
                    onChange={handleInputChange}
                    onFocus={() => {
                      if (formData.empresa.trim().length >= 1) setShowEmpresaDropdown(true);
                    }}
                    onBlur={() => setTimeout(() => setShowEmpresaDropdown(false), 200)}
                    placeholder="Escribe o selecciona tu empresa..."
                    autoComplete="off"
                    style={{
                      width: '100%', minHeight: '48px', padding: '0 14px', borderRadius: '10px',
                      backgroundColor: '#0f172a', border: '1px solid #475569', color: '#f8fafc', fontSize: '16px', boxSizing: 'border-box'
                    }}
                  />

                  {showEmpresaDropdown && sugerenciasEmpresa.length > 0 && (
                    <ul style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                      backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '10px',
                      maxHeight: '180px', overflowY: 'auto', margin: '4px 0 0', padding: 0, listStyle: 'none',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}>
                      {sugerenciasEmpresa.map((emp) => (
                        <li
                          key={emp.id}
                          onMouseDown={() => handleSelectEmpresa(emp.nombre)}
                          style={{
                            padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #334155',
                            fontSize: '14px', fontWeight: '600', color: '#f8fafc'
                          }}
                        >
                          🏢 {emp.nombre}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Subida Documentación Conductor Obligatoria */}
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
                    Documentos Obligatorios del Conductor (*):
                  </span>

                  {/* Carnet de Conducir */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    minHeight: '48px', border: `1.5px dashed ${tieneDocumento('Permiso de Conducir', infoPersonaBD, carnetFile) ? '#10b981' : '#ef4444'}`,
                    borderRadius: '10px', backgroundColor: tieneDocumento('Permiso de Conducir', infoPersonaBD, carnetFile) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                    padding: '0 12px', cursor: 'pointer'
                  }}>
                    <UploadCloud size={18} color={tieneDocumento('Permiso de Conducir', infoPersonaBD, carnetFile) ? '#10b981' : '#ef4444'} />
                    <span style={{ fontSize: '13px', color: tieneDocumento('Permiso de Conducir', infoPersonaBD, carnetFile) ? '#34d399' : '#f87171', fontWeight: '600' }}>
                      {carnetFile ? carnetFile.name : (tieneDocumento('Permiso de Conducir', infoPersonaBD, null) ? 'Carnet de Conducir (Registrado en BD)' : 'Subir Carnet de Conducir *')}
                    </span>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setCarnetFile(e.target.files[0])} style={{ display: 'none' }} />
                  </label>

                  {/* Tarjeta CAP */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    minHeight: '48px', border: `1.5px dashed ${tieneDocumento('CAP', infoPersonaBD, capFile) ? '#10b981' : '#ef4444'}`,
                    borderRadius: '10px', backgroundColor: tieneDocumento('CAP', infoPersonaBD, capFile) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                    padding: '0 12px', cursor: 'pointer'
                  }}>
                    <UploadCloud size={18} color={tieneDocumento('CAP', infoPersonaBD, capFile) ? '#10b981' : '#ef4444'} />
                    <span style={{ fontSize: '13px', color: tieneDocumento('CAP', infoPersonaBD, capFile) ? '#34d399' : '#f87171', fontWeight: '600' }}>
                      {capFile ? capFile.name : (tieneDocumento('CAP', infoPersonaBD, null) ? 'Tarjeta CAP (Registrada en BD)' : 'Subir Tarjeta CAP *')}
                    </span>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setCapFile(e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                </div>

              </div>
            </section>

            {/* SECCIÓN 2: VEHÍCULO TRACTOR */}
            <section style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Truck size={20} /> 2. Vehículo Tractor
                </h2>
                {infoVehiculoBD.verificado && (
                  <span style={{
                    fontSize: '11px', fontWeight: '700', padding: '4px 8px', borderRadius: '6px',
                    backgroundColor: infoVehiculoBD.existe ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: infoVehiculoBD.existe ? '#34d399' : '#fbbf24'
                  }}>
                    {infoVehiculoBD.existe ? 'Vehículo en BD' : 'Nuevo Vehículo'}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                    Matrícula Vehículo Tractor *
                  </label>
                  <input
                    type="text"
                    name="matricula_vehiculo"
                    value={formData.matricula_vehiculo}
                    onChange={handleInputChange}
                    onBlur={() => verificarVehiculoBD()}
                    placeholder="Ej: 1234ABC"
                    autoComplete="off"
                    required
                    style={{
                      width: '100%', minHeight: '48px', padding: '0 14px', borderRadius: '10px',
                      backgroundColor: '#0f172a', border: '1px solid #475569', color: '#f8fafc', fontSize: '18px',
                      fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', boxSizing: 'border-box'
                    }}
                  />

                  {infoVehiculoBD.verificado && infoVehiculoBD.documentos.length > 0 && (
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {infoVehiculoBD.documentos.map((doc, idx) => (
                        <span key={idx} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '11.5px', fontWeight: '600', padding: '4px 8px', borderRadius: '6px',
                          backgroundColor: doc.existe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: doc.existe ? '#34d399' : '#f87171',
                          border: `1px solid ${doc.existe ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                        }}>
                          {doc.existe ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {doc.existe ? `${doc.nombre} Entregado` : `Falta ${doc.nombre}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                    Destino en Planta
                  </label>
                  <input
                    type="text"
                    name="destino"
                    value={formData.destino}
                    onChange={handleInputChange}
                    placeholder="Ej: Almacén A, Báscula..."
                    autoComplete="off"
                    style={{
                      width: '100%', minHeight: '48px', padding: '0 14px', borderRadius: '10px',
                      backgroundColor: '#0f172a', border: '1px solid #475569', color: '#f8fafc', fontSize: '16px', boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Documentos del Vehículo Obligatorios */}
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
                    Documentos Obligatorios del Vehículo (*):
                  </span>

                  {/* ITV */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    minHeight: '48px', border: `1.5px dashed ${tieneDocumento('ITV', infoVehiculoBD, itvVehiculo) ? '#10b981' : '#ef4444'}`,
                    borderRadius: '10px', backgroundColor: tieneDocumento('ITV', infoVehiculoBD, itvVehiculo) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                    padding: '0 12px', cursor: 'pointer'
                  }}>
                    <UploadCloud size={18} color={tieneDocumento('ITV', infoVehiculoBD, itvVehiculo) ? '#10b981' : '#ef4444'} />
                    <span style={{ fontSize: '13px', color: tieneDocumento('ITV', infoVehiculoBD, itvVehiculo) ? '#34d399' : '#f87171', fontWeight: '600' }}>
                      {itvVehiculo ? itvVehiculo.name : (tieneDocumento('ITV', infoVehiculoBD, null) ? 'Ficha ITV (Registrada en BD)' : 'Subir Ficha ITV *')}
                    </span>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setItvVehiculo(e.target.files[0])} style={{ display: 'none' }} />
                  </label>

                  {/* Seguro */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    minHeight: '48px', border: `1.5px dashed ${tieneDocumento('Seguro', infoVehiculoBD, seguroVehiculo) ? '#10b981' : '#ef4444'}`,
                    borderRadius: '10px', backgroundColor: tieneDocumento('Seguro', infoVehiculoBD, seguroVehiculo) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                    padding: '0 12px', cursor: 'pointer'
                  }}>
                    <UploadCloud size={18} color={tieneDocumento('Seguro', infoVehiculoBD, seguroVehiculo) ? '#10b981' : '#ef4444'} />
                    <span style={{ fontSize: '13px', color: tieneDocumento('Seguro', infoVehiculoBD, seguroVehiculo) ? '#34d399' : '#f87171', fontWeight: '600' }}>
                      {seguroVehiculo ? seguroVehiculo.name : (tieneDocumento('Seguro', infoVehiculoBD, null) ? 'Póliza de Seguro (Registrada en BD)' : 'Subir Póliza de Seguro *')}
                    </span>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setSeguroVehiculo(e.target.files[0])} style={{ display: 'none' }} />
                  </label>

                  {/* Permiso de Circulación */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    minHeight: '48px', border: `1.5px dashed ${tieneDocumento('Permiso de Circulación', infoVehiculoBD, permisoVehiculo) ? '#10b981' : '#ef4444'}`,
                    borderRadius: '10px', backgroundColor: tieneDocumento('Permiso de Circulación', infoVehiculoBD, permisoVehiculo) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                    padding: '0 12px', cursor: 'pointer'
                  }}>
                    <UploadCloud size={18} color={tieneDocumento('Permiso de Circulación', infoVehiculoBD, permisoVehiculo) ? '#10b981' : '#ef4444'} />
                    <span style={{ fontSize: '13px', color: tieneDocumento('Permiso de Circulación', infoVehiculoBD, permisoVehiculo) ? '#34d399' : '#f87171', fontWeight: '600' }}>
                      {permisoVehiculo ? permisoVehiculo.name : (tieneDocumento('Permiso de Circulación', infoVehiculoBD, null) ? 'Permiso Circulación (Registrado en BD)' : 'Subir Permiso de Circulación *')}
                    </span>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setPermisoVehiculo(e.target.files[0])} style={{ display: 'none' }} />
                  </label>

                  {/* Tarjeta de Transporte */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    minHeight: '48px', border: `1.5px dashed ${tieneDocumento('Tarjeta de Transporte', infoVehiculoBD, tarjetaVehiculo) ? '#10b981' : '#ef4444'}`,
                    borderRadius: '10px', backgroundColor: tieneDocumento('Tarjeta de Transporte', infoVehiculoBD, tarjetaVehiculo) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                    padding: '0 12px', cursor: 'pointer'
                  }}>
                    <UploadCloud size={18} color={tieneDocumento('Tarjeta de Transporte', infoVehiculoBD, tarjetaVehiculo) ? '#10b981' : '#ef4444'} />
                    <span style={{ fontSize: '13px', color: tieneDocumento('Tarjeta de Transporte', infoVehiculoBD, tarjetaVehiculo) ? '#34d399' : '#f87171', fontWeight: '600' }}>
                      {tarjetaVehiculo ? tarjetaVehiculo.name : (tieneDocumento('Tarjeta de Transporte', infoVehiculoBD, null) ? 'Tarjeta Transporte (Registrada en BD)' : 'Subir Tarjeta de Transporte *')}
                    </span>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setTarjetaVehiculo(e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                </div>
              </div>
            </section>

            {/* SECCIÓN 3: REMOLQUE */}
            <section style={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '20px'
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  name="lleva_remolque"
                  checked={formData.lleva_remolque}
                  onChange={handleInputChange}
                  style={{ width: '22px', height: '22px', accentColor: '#3b82f6' }}
                />
                <Caravan size={22} color={formData.lleva_remolque ? '#f59e0b' : '#94a3b8'} />
                <span style={{ fontSize: '15px', fontWeight: '700', color: '#f8fafc' }}>
                  ¿Llevas Remolque / Semirremolque?
                </span>
              </label>

              {formData.lleva_remolque && (
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#cbd5e1' }}>
                      Matrícula del Remolque
                    </label>
                    <input
                      type="text"
                      name="matricula_remolque"
                      value={formData.matricula_remolque}
                      onChange={handleInputChange}
                      onBlur={() => verificarRemolqueBD()}
                      placeholder="Ej: R1234BBB"
                      autoComplete="off"
                      style={{
                        width: '100%', minHeight: '48px', padding: '0 14px', borderRadius: '10px',
                        backgroundColor: '#0f172a', border: '1px solid #475569', color: '#f8fafc', fontSize: '18px',
                        fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', boxSizing: 'border-box'
                      }}
                    />

                    {infoRemolqueBD.verificado && infoRemolqueBD.documentos.length > 0 && (
                      <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {infoRemolqueBD.documentos.map((doc, idx) => (
                          <span key={idx} style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            fontSize: '11.5px', fontWeight: '600', padding: '4px 8px', borderRadius: '6px',
                            backgroundColor: doc.existe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: doc.existe ? '#34d399' : '#f87171',
                            border: `1px solid ${doc.existe ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          }}>
                            {doc.existe ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            {doc.existe ? `${doc.nombre} Entregado` : `Falta ${doc.nombre}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Documentos Remolque Obligatorios */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      minHeight: '48px', border: `1.5px dashed ${tieneDocumento('ITV', infoRemolqueBD, itvRemolque) ? '#10b981' : '#ef4444'}`,
                      borderRadius: '10px', backgroundColor: tieneDocumento('ITV', infoRemolqueBD, itvRemolque) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                      padding: '0 12px', cursor: 'pointer'
                    }}>
                      <UploadCloud size={18} color={tieneDocumento('ITV', infoRemolqueBD, itvRemolque) ? '#10b981' : '#ef4444'} />
                      <span style={{ fontSize: '13px', color: tieneDocumento('ITV', infoRemolqueBD, itvRemolque) ? '#34d399' : '#f87171', fontWeight: '600' }}>
                        {itvRemolque ? itvRemolque.name : (tieneDocumento('ITV', infoRemolqueBD, null) ? 'Ficha ITV Remolque (Registrada en BD)' : 'Subir Ficha ITV Remolque *')}
                      </span>
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setItvRemolque(e.target.files[0])} style={{ display: 'none' }} />
                    </label>

                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      minHeight: '48px', border: `1.5px dashed ${tieneDocumento('Seguro', infoRemolqueBD, seguroRemolque) ? '#10b981' : '#ef4444'}`,
                      borderRadius: '10px', backgroundColor: tieneDocumento('Seguro', infoRemolqueBD, seguroRemolque) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                      padding: '0 12px', cursor: 'pointer'
                    }}>
                      <UploadCloud size={18} color={tieneDocumento('Seguro', infoRemolqueBD, seguroRemolque) ? '#10b981' : '#ef4444'} />
                      <span style={{ fontSize: '13px', color: tieneDocumento('Seguro', infoRemolqueBD, seguroRemolque) ? '#34d399' : '#f87171', fontWeight: '600' }}>
                        {seguroRemolque ? seguroRemolque.name : (tieneDocumento('Seguro', infoRemolqueBD, null) ? 'Seguro Remolque (Registrado en BD)' : 'Subir Seguro Remolque *')}
                      </span>
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setSeguroRemolque(e.target.files[0])} style={{ display: 'none' }} />
                    </label>

                    <label style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      minHeight: '48px', border: `1.5px dashed ${tieneDocumento('Tarjeta de Transporte', infoRemolqueBD, tarjetaRemolque) ? '#10b981' : '#ef4444'}`,
                      borderRadius: '10px', backgroundColor: tieneDocumento('Tarjeta de Transporte', infoRemolqueBD, tarjetaRemolque) ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.08)',
                      padding: '0 12px', cursor: 'pointer'
                    }}>
                      <UploadCloud size={18} color={tieneDocumento('Tarjeta de Transporte', infoRemolqueBD, tarjetaRemolque) ? '#10b981' : '#ef4444'} />
                      <span style={{ fontSize: '13px', color: tieneDocumento('Tarjeta de Transporte', infoRemolqueBD, tarjetaRemolque) ? '#34d399' : '#f87171', fontWeight: '600' }}>
                        {tarjetaRemolque ? tarjetaRemolque.name : (tieneDocumento('Tarjeta de Transporte', infoRemolqueBD, null) ? 'Tarjeta Transporte Remolque (Registrada en BD)' : 'Subir Tarjeta Transporte Remolque *')}
                      </span>
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e => setTarjetaRemolque(e.target.files[0])} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              )}
            </section>

            {/* BOTÓN REGISTRAR DOCUMENTACIÓN */}
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                minHeight: '54px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '17px',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)'
              }}
            >
              {isSubmitting ? 'Guardando Documentación...' : 'Guardar y Registrar Documentación'}
            </button>

          </form>
        </main>
      )}

      <Toast toasts={toasts} />
    </div>
  );
}
