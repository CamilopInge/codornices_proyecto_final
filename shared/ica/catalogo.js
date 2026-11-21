/**
 * Catalogo oficial ICA para codornices de postura (Coturnix coturnix).
 * Fuente: matriz EvalCodorniz derivada de la metodologia ICA de bienestar animal.
 *
 * Esta es la UNICA fuente de verdad del catalogo. Backend y frontend la importan;
 * ninguna capa debe redefinir indicadores, escalas ni reglas de aplicabilidad.
 *
 * Campos de cada indicador:
 *   codigo      Identificador ICA (MBA1, MBR7, MBG10...).
 *   grupo       MBA | MBR | MBG.
 *   nombre      Nombre del indicador en la norma.
 *   pregunta    Pregunta guia para el evaluador.
 *   metodo      Metodo de verificacion declarado por la norma.
 *   niveles     [[puntaje, descripcion]] ordenados de mayor a menor puntaje.
 *   captura     Tipo de campo que la interfaz debe presentar (ver TIPO_CAPTURA).
 *   aplica      Reglas de aplicabilidad; null = aplica siempre.
 *   requiereDocumento  true si el nivel debe respaldarse con soporte documental.
 *   notaNormativa      Advertencia cuando el texto oficial esta incompleto.
 */

export const GRUPOS = ['MBA', 'MBR', 'MBG'];

export const GRUPO_NOMBRE = {
  MBA: 'Medidas basadas en el animal',
  MBR: 'Medidas basadas en recursos',
  MBG: 'Medidas basadas en la gestion'
};

export const TIPO_CAPTURA = {
  ESCALA: 'escala',
  PORCENTAJE: 'porcentaje',
  DENSIDAD_JAULA: 'densidad_jaula',
  DENSIDAD_PISO: 'densidad_piso',
  RATIO_BEBEDERO: 'ratio_bebedero',
  RATIO_COMEDERO: 'ratio_comedero',
  DOCUMENTAL: 'documental',
  DOCUMENTAL_PORCENTAJE: 'documental_porcentaje',
  DOCUMENTAL_MIXTO: 'documental_mixto'
};

export const INDICADORES = [
  {
    codigo: 'MBR1',
    grupo: 'MBR',
    nombre: 'Alojamiento',
    pregunta: 'Las codornices cuentan con un lugar de alojamiento?',
    metodo: 'Inspeccion visual',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Provee refugio y proteccion de clima y depredadores, limpio y libre de humedad'],
      [55, 'Cuenta con alojamiento pero sin equipamiento, humedo y con materia fecal acumulada'],
      [0, 'No cuenta con ninguna instalacion']
    ]
  },
  {
    codigo: 'MBR2',
    grupo: 'MBR',
    nombre: 'Medicion de particulas suspendidas en el aire',
    pregunta: 'Cual es el nivel de saturacion de particulas en el aire?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'El dedo del inspector no esta sucio o es minimo'],
      [55, 'El dedo tiene polvo pero es facil retirarlo'],
      [0, 'El dedo esta muy saturado de polvo y es dificil retirarlo']
    ]
  },
  {
    codigo: 'MBR3',
    grupo: 'MBR',
    nombre: 'Calidad de la cama',
    pregunta: 'La calidad de la cama es adecuada?',
    metodo: 'Inspeccion visual con muestreo (solo en corral o galpon en piso)',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: { sistema: 'piso' },
    requiereDocumento: false,
    niveles: [
      [100, 'No se compacta, es granuloso y se desmorona con facilidad'],
      [55, 'Ligeramente compactado por humedad o dificultad para tomar la muestra'],
      [0, 'Muy compacto por humedad, imposible tomar la muestra']
    ]
  },
  {
    codigo: 'MBR4',
    grupo: 'MBR',
    nombre: 'Integridad de la jaula',
    pregunta: 'La jaula se encuentra en buen estado y es adecuada?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: { sistema: 'jaula' },
    requiereDocumento: false,
    niveles: [
      [100, 'Altura suficiente para postura erguida, integra sin salientes, limpia'],
      [55, 'Altura suficiente pero no integra y/o sucia'],
      [0, 'Altura insuficiente, el techo limita la postura']
    ]
  },
  {
    codigo: 'MBR5',
    grupo: 'MBR',
    nombre: 'Integridad de los bebederos',
    pregunta: 'La calidad de los bebederos es adecuada?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Altura adecuada, sin derrames, limpio e integro'],
      [55, 'Sucios, con desperdicio o derrames de agua'],
      [0, 'No hay bebederos o estan averiados con salientes que lastiman']
    ]
  },
  {
    codigo: 'MBR6',
    grupo: 'MBR',
    nombre: 'Suministro de agua en los bebederos',
    pregunta: 'Las aves tienen acceso suficiente al agua?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Bebederos con agua, presion y flujo constante o llenado evidente'],
      [55, 'Agua insuficiente, presion o flujo fluctuante o llenado pobre por goteo'],
      [0, 'No hay suministro de agua, sin presion ni flujo']
    ]
  },
  {
    codigo: 'MBR7',
    grupo: 'MBR',
    nombre: 'Animales por bebedero',
    pregunta: 'La cantidad de bebederos es suficiente para la cantidad de animales existentes?',
    metodo: 'Inspeccion documental e inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.RATIO_BEBEDERO,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Numero de animales por bebedero menor o igual al limite indicado por casa genetica o fabricante'],
      [55, 'Supera hasta un maximo de 30% la indicacion'],
      [0, 'Supera en mas de un 30%']
    ]
  },
  {
    codigo: 'MBR8',
    grupo: 'MBR',
    nombre: 'Calidad del agua de bebida',
    pregunta: 'Existe protocolo de tratamiento de agua implementado? El agua suministrada esta limpia?',
    metodo: 'Inspeccion visual y documental',
    captura: TIPO_CAPTURA.DOCUMENTAL_MIXTO,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Fuentes y tanques limpios y aptos, protocolo de tratamiento con soportes de implementacion'],
      [55, 'Recursos funcionales y hay registros, pero no existe protocolo escrito o no cumple algun requisito'],
      [0, 'No hay infraestructura o recursos funcionales, no hay registros, o el agua esta sucia']
    ]
  },
  {
    codigo: 'MBR9',
    grupo: 'MBR',
    nombre: 'Integridad de los comederos',
    pregunta: 'La calidad de los comederos es adecuada?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Altura suficiente, comedero integro y limpio'],
      [55, 'Altura suficiente pero deteriorado, sucio o expuesto al sol'],
      [0, 'Altura insuficiente para que el ave se alimente comodamente']
    ]
  },
  {
    codigo: 'MBR10',
    grupo: 'MBR',
    nombre: 'Animales por comedero',
    pregunta: 'Los comederos garantizan el acceso al alimento de todos los animales existentes?',
    metodo: 'Inspeccion visual e inspeccion documental',
    captura: TIPO_CAPTURA.RATIO_COMEDERO,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Numero de animales por comedero dentro del 30% permitido, sin competencia'],
      [55, 'Por encima del 30% pero sin evidencia de competencia'],
      [0, 'Supera el 30% y hay competencia por el alimento']
    ]
  },
  {
    codigo: 'MBR11',
    grupo: 'MBR',
    nombre: 'Medios para contribuir al confort termico',
    pregunta: 'Existen medios para contribuir al confort termico de los animales?',
    metodo: 'Inspeccion visual sin muestreo y documental segun el caso',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Infraestructura, equipos e insumos existen, estan declarados en el POE y son funcionales'],
      [55, 'Existen y son funcionales pero no estan declarados en el POE'],
      [0, 'No existen o no son funcionales']
    ]
  },
  {
    codigo: 'MBR12',
    grupo: 'MBR',
    nombre: 'Calidad, integridad y funcionalidad del nidal',
    pregunta: 'Los nidales se encuentran integros y funcionales para estimular la ovoposicion?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Integros, con percha y acceso a material seco y friable'],
      [55, 'Condiciones no ideales como sin cama o envejecidos, pero funcionales'],
      [0, 'No integros sin piso o percha ausente, o fracturados sin aislamiento visual']
    ]
  },
  {
    codigo: 'MBR13',
    grupo: 'MBR',
    nombre: 'Espacio disponible para codornices en jaula',
    pregunta: 'Cual es el espacio disponible para las aves? Calculo: CJ = AT/TA, IG = AJ/TG, promedio final D',
    metodo: 'Inspeccion visual con muestreo y documental para mas de 1.000 codornices',
    captura: TIPO_CAPTURA.DENSIDAD_JAULA,
    aplica: { sistema: 'jaula' },
    requiereDocumento: false,
    niveles: [
      [100, 'Numero de codornices igual o menor a 55 aves por metro cuadrado'],
      [0, 'Numero de codornices mayor a 55 aves por metro cuadrado']
    ]
  },
  {
    codigo: 'MBR14',
    grupo: 'MBR',
    nombre: 'Espacio disponible en ponedoras en piso',
    pregunta: 'Cual es el espacio disponible para las aves? Calculo: Espacio = TG/AU',
    metodo: 'Inspeccion documental',
    captura: TIPO_CAPTURA.DENSIDAD_PISO,
    aplica: { sistema: 'piso' },
    requiereDocumento: false,
    niveles: [
      [100, 'Numero de codornices igual o menor a 55 aves por metro cuadrado'],
      [0, 'Numero de codornices mayor a 55 aves por metro cuadrado']
    ]
  },
  {
    codigo: 'MBA1',
    grupo: 'MBA',
    nombre: 'Jadeo',
    pregunta: 'Las aves presentan jadeo?',
    metodo: 'Inspeccion visual sin muestreo',
    captura: TIPO_CAPTURA.PORCENTAJE,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Porcentaje de aves con jadeo menor o igual a 40%'],
      [55, 'Mayor a 40% y menor o igual a 60%'],
      [0, 'Mayor a 60%']
    ]
  },
  {
    codigo: 'MBA2',
    grupo: 'MBA',
    nombre: 'Acurrucarse en grupos (amontonamiento)',
    pregunta: 'Las aves presentan amontonamiento?',
    metodo: 'Inspeccion visual sin muestreo',
    captura: TIPO_CAPTURA.PORCENTAJE,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Porcentaje de amontonamiento menor o igual a 40%'],
      [55, 'Mayor a 40% y menor o igual a 60%'],
      [0, 'Mayor a 60%']
    ]
  },
  {
    codigo: 'MBA3',
    grupo: 'MBA',
    nombre: 'Integridad del hueso de la quilla',
    pregunta: 'Cual es el nivel de dano en aves con evidencia de deformidades o desviacion en el hueso de la quilla?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Ausente, sin anormalidades ni perdida de la forma recta de la quilla'],
      [55, 'Leve, inicio de desviacion con fractura, callosidad o indicios de curvatura'],
      [0, 'Severo, desviacion evidente a la vista y a la palpacion']
    ]
  },
  {
    codigo: 'MBA4',
    grupo: 'MBA',
    nombre: 'Pododermatitis',
    pregunta: 'Las aves presentan pododermatitis y que nivel de afectacion tienen?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Ausente, sin inflamacion, lesiones ni dolor en almohadilla plantar o membrana interdigital'],
      [55, 'Leve, heridas o inflamacion leve sin senales de dolor evidente'],
      [0, 'Severo, fibromas o inflamacion severa con senales de dolor evidentes']
    ]
  },
  {
    codigo: 'MBA5',
    grupo: 'MBA',
    nombre: 'Dano en los dedos',
    pregunta: 'Que nivel de dano hay en los dedos de los animales?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Sin anormalidades ni perdida de integridad en los dedos'],
      [55, 'Heridas, inflamaciones articulares, amputaciones o perdida de tejido ungueal sin dolor evidente'],
      [0, 'Las mismas lesiones con senales de dolor evidentes']
    ]
  },
  {
    codigo: 'MBA6',
    grupo: 'MBA',
    nombre: 'Lesiones en piel y otros tegumentos',
    pregunta: 'Se observan lesiones en piel y otros tegumentos?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Sin lesiones o hasta 2 rasgunos o lesiones activas de maximo 0,5 cm, sin prolapso'],
      [55, 'Sin prolapso, pero al menos una lesion de 0,5 a 2,0 cm o 3 o mas rasgunos de maximo 0,5 cm'],
      [0, 'Una o mas lesiones de 2 cm o mas, o evidencia de prolapso en cloaca']
    ]
  },
  {
    codigo: 'MBA7',
    grupo: 'MBA',
    nombre: 'Suciedad y apariencia del plumaje',
    pregunta: 'Cual es la apariencia y el estado de suciedad del plumaje de las aves?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Plumaje homogeneo acorde al color de la raza, raquis desarrollado, plumas planas, largas y ordenadas sin contar suciedad de cloaca'],
      [55, 'Plumaje homogeneo pero con algunas zonas con plumas quebradas, desordenadas o sin brillo'],
      [0, 'Plumaje no acorde a la raza, raquis quebrantado, plumas desordenadas o erizadas, o perdida de continuidad del manto']
    ]
  },
  {
    codigo: 'MBA8',
    grupo: 'MBA',
    nombre: 'Integridad oculo-nasal',
    pregunta: 'Cuantos animales se observan con descarga nasal u ocular, o con lesiones agudas o cronicas en estas areas?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Sin descargas oculo-nasales, carnosidades oculares ni lesiones'],
      [55, 'Sin carnosidades ni lesiones, pero con descarga nasal u ocular, solo una de las dos'],
      [0, 'Descarga nasal y ocular, o carnosidades oculares, o lesiones agudas o cronicas en estas areas']
    ]
  },
  {
    codigo: 'MBA9',
    grupo: 'MBA',
    nombre: 'Condicion del pico',
    pregunta: 'Cual es el nivel de dano asociado a la condicion del pico?',
    metodo: 'Inspeccion visual con muestreo',
    captura: TIPO_CAPTURA.ESCALA,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'No presenta lesiones de ningun tipo'],
      [55, 'Tiene una lesion que no causa dolor ni impide comer o acicalarse'],
      [0, 'Presenta lesiones que causan dolor']
    ]
  },
  {
    codigo: 'MBA10',
    grupo: 'MBA',
    nombre: 'Mortalidad',
    pregunta: 'Cual es la tasa de mortalidad acumulada de los ultimos 5 ciclos?',
    metodo: 'Inspeccion documental',
    captura: TIPO_CAPTURA.DOCUMENTAL_PORCENTAJE,
    aplica: { minAvesExclusivo: 200 },
    requiereDocumento: true,
    niveles: [
      [100, 'Mortalidad menor o igual a 12%'],
      [55, 'Mayor a 12% y menor o igual a 14%'],
      [0, 'Mayor a 14%']
    ]
  },
  {
    codigo: 'MBA11',
    grupo: 'MBA',
    nombre: 'Relacion humano-animal',
    pregunta: 'Se observa en los animales y las personas del predio una relacion positiva humano-animal?',
    metodo: 'Inspeccion visual con muestreo, recorriendo antes el galpon para alertar a las aves de la presencia de la persona',
    captura: TIPO_CAPTURA.PORCENTAJE,
    aplica: null,
    requiereDocumento: false,
    niveles: [
      [100, 'Mas del 90% de los animales aceptan el contacto'],
      [55, 'Entre el 70% y el 89% de los animales estan alerta a la presencia de la persona'],
      [0, 'Mas del 69% de los animales muestran reacciones negativas o huyen']
    ]
  },
  {
    codigo: 'MBG1',
    grupo: 'MBG',
    nombre: 'Calidad del agua de bebida',
    pregunta: 'Las aves cuentan con agua de calidad para su consumo?',
    metodo: 'Inspeccion documental',
    captura: TIPO_CAPTURA.DOCUMENTAL,
    aplica: { minAves: 200 },
    requiereDocumento: true,
    niveles: [
      [100, 'Certificado o informe de analisis fisicoquimico y microbiologico negativo de la fuente de agua, de laboratorio autorizado, con vigencia de 1 ano, membretado y firmado; si hubo hallazgos positivos hay evidencia de medidas correctivas'],
      [55, 'No hay analisis, el certificado esta vencido o sin firma ni membrete, o no hay medidas correctivas ante hallazgos positivos']
    ]
  },
  {
    codigo: 'MBG2',
    grupo: 'MBG',
    nombre: 'Alimentacion equilibrada',
    pregunta: 'Las aves cuentan con alimentacion equilibrada?',
    metodo: 'Inspeccion documental',
    captura: TIPO_CAPTURA.DOCUMENTAL,
    aplica: { minAves: 200 },
    requiereDocumento: true,
    niveles: [
      [100, 'Soporte del alimento con facturas o notas de recepcion acorde a la etapa fisiologica y proveniente de planta registrada ante el ICA'],
      [0, 'No hay documento que demuestre que el alimento es apropiado para la etapa fisiologica']
    ]
  },
  {
    codigo: 'MBG3',
    grupo: 'MBG',
    nombre: 'Programas de vigilancia y gestion sanitaria',
    pregunta: 'Existe participacion en el cumplimiento de las medidas de bioseguridad y en la prevencion, control y erradicacion de enfermedades establecidas por el ICA?',
    metodo: 'Inspeccion documental',
    captura: TIPO_CAPTURA.DOCUMENTAL,
    aplica: { minAves: 200 },
    requiereDocumento: true,
    niveles: [
      [100, 'Existe plan, procedimiento o documento para el control y erradicacion de enfermedades de control oficial'],
      [0, 'No existe dicho plan, procedimiento o documento']
    ]
  },
  {
    codigo: 'MBG4',
    grupo: 'MBG',
    nombre: 'Procedimiento Operativo Estandarizado (POE)',
    pregunta: 'La granja cuenta con el POE de bienestar animal o un capitulo de bienestar animal dentro de un POE existente?',
    metodo: 'Inspeccion documental',
    captura: TIPO_CAPTURA.DOCUMENTAL,
    aplica: { minAves: 200 },
    requiereDocumento: true,
    niveles: [
      [100, 'Incluye como minimo planes de vacunacion, densidades, manejo de animales enfermos y practicas para reducir el dolor; firmado por MV, MVZ o zootecnista con matricula vigente'],
      [0, 'No tiene el contenido minimo o no esta firmado por el profesional']
    ]
  },
  {
    codigo: 'MBG5',
    grupo: 'MBG',
    nombre: 'Condiciones termicas diarias y manejo de emergencias',
    pregunta: 'Se realiza un monitoreo diario y existe un protocolo de procedimientos de emergencia?',
    metodo: 'Inspeccion documental',
    captura: TIPO_CAPTURA.DOCUMENTAL,
    aplica: { minAves: 200 },
    requiereDocumento: true,
    niveles: [
      [100, 'Protocolo de emergencias termicas como capitulo de un POE, con estrategias de respuesta, procedimientos, equipos e insumos; firmado por MV, MVZ o zootecnista con matricula vigente'],
      [0, 'No existe el protocolo o no cumple los requisitos']
    ]
  },
  {
    codigo: 'MBG6',
    grupo: 'MBG',
    nombre: 'Programa de iluminacion',
    pregunta: 'Existe un programa de manejo del regimen de luz y oscuridad?',
    metodo: 'Inspeccion documental',
    captura: TIPO_CAPTURA.DOCUMENTAL,
    aplica: { minAves: 200 },
    requiereDocumento: true,
    niveles: [
      [100, 'Programa de luz y oscuridad de 24 horas especifico por granja o galpon a lo largo del ciclo, mas protocolo ante cambios abruptos de iluminacion con procedimientos, equipos e insumos; firmado por MV, MVZ o zootecnista con matricula vigente'],
      [0, 'No hay evidencia documental del programa o del protocolo']
    ]
  },
  {
    codigo: 'MBG7',
    grupo: 'MBG',
    nombre: 'Capacitacion basica en bienestar animal',
    pregunta: 'El personal que maneja las codornices cuenta con constancia de aprobacion del curso en bienestar animal?',
    metodo: 'Inspeccion documental',
    captura: TIPO_CAPTURA.DOCUMENTAL,
    aplica: { minAves: 200 },
    requiereDocumento: true,
    niveles: [
      [100, 'Todo el personal que maneja los animales tiene certificado de asistencia y aprobacion expedido por ICA, SENA, profesionales con experiencia soportada o entidades del plan de capacitacion del ICA'],
      [0, 'No hay certificado, no todo el personal esta certificado o lo expide una entidad no valida']
    ]
  },
  {
    codigo: 'MBG8',
    grupo: 'MBG',
    nombre: 'Protocolo de sacrificio humanitario o eutanasia',
    pregunta: 'Existe un protocolo de sacrificio humanitario o eutanasia?',
    metodo: 'Inspeccion documental',
    captura: TIPO_CAPTURA.DOCUMENTAL,
    aplica: { minAves: 200 },
    requiereDocumento: true,
    niveles: [
      [100, 'Protocolo en formato de ficha tecnica con metodo, procedimiento, criterios, compromiso etico y emergencias que lo ameritan, basado en el titulo 7 del Codigo Terrestre de la OMSA; firmado por MV, MVZ o zootecnista con matricula vigente'],
      [0, 'No existe, no esta firmado por el profesional o no se basa en el titulo 7 de la OMSA']
    ]
  },
  {
    codigo: 'MBG9',
    grupo: 'MBG',
    nombre: 'Capacitacion en tecnicas de sacrificio humanitario',
    pregunta: 'El personal cuenta con acreditacion y constancia de capacitacion en tecnicas de sacrificio humanitario o eutanasia?',
    metodo: 'Inspeccion documental',
    captura: TIPO_CAPTURA.DOCUMENTAL,
    aplica: { minAves: 200 },
    requiereDocumento: true,
    niveles: [
      [100, 'Si lo realiza personal no profesional, todos tienen certificado de capacitacion aprobada; si lo realiza MV, MVZ o zootecnista entrenado, basta con matricula profesional vigente'],
      [0, 'No hay evidencia de capacitacion del personal o el profesional no tiene matricula vigente']
    ]
  },
  {
    codigo: 'MBG10',
    grupo: 'MBG',
    nombre: 'Uso responsable de medicamentos e insumos veterinarios',
    pregunta: 'Se cumple con las Buenas Practicas para el Uso de Medicamentos Veterinarios (BPUMV)?',
    metodo: 'Inspeccion documental',
    captura: TIPO_CAPTURA.DOCUMENTAL,
    aplica: { minAves: 200 },
    requiereDocumento: true,
    notaNormativa: 'El texto oficial del nivel 50 (Tabla 39 de la norma ICA) aun no ha sido transcrito. Verificar contra la fuente antes de usar este nivel en una visita oficial.',
    niveles: [
      [100, 'No usa sustancias prohibidas por el ICA, usa promotores de crecimiento solo si el registro ICA lo indica, lleva registros de entrada y salida de medicamentos con fecha, dosis, via y dias de retiro, y tiene asesoria de MV o MVZ con matricula vigente'],
      [50, 'Cumplimiento parcial de las BPUMV (texto oficial pendiente de transcripcion de la Tabla 39)'],
      [0, 'Uso de sustancias prohibidas, sin registros de medicamentos o sin asesoria profesional']
    ]
  }
];

/** Indice por codigo para acceso O(1). */
export const INDICE = Object.freeze(
  Object.fromEntries(INDICADORES.map((indicador) => [indicador.codigo, indicador]))
);

/** Umbrales de los campos de captura numerica. */
export const UMBRALES_PORCENTAJE = {
  MBA1: { etiqueta: 'Porcentaje de aves con jadeo', calcular: (v) => (v <= 40 ? 100 : v <= 60 ? 55 : 0) },
  MBA2: { etiqueta: 'Porcentaje de aves amontonadas', calcular: (v) => (v <= 40 ? 100 : v <= 60 ? 55 : 0) },
  MBA10: { etiqueta: 'Mortalidad acumulada de 5 ciclos (%)', calcular: (v) => (v <= 12 ? 100 : v <= 14 ? 55 : 0) },
  MBA11: { etiqueta: 'Porcentaje de aves que aceptan el contacto', calcular: (v) => (v > 90 ? 100 : v >= 70 ? 55 : 0) }
};

/** Densidad maxima permitida por la norma, en aves por metro cuadrado. */
export const DENSIDAD_MAXIMA = 55;

/** Numero de aves a partir del cual se exige soporte documental de agua y espacio. */
export const UMBRAL_SOPORTE_DOCUMENTAL = 1000;

export const VERSION_CATALOGO = 'ICA-CODORNIZ-2026.11';
