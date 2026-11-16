-- ============================================================================
-- Capaz: 20 ofertas de empleo DEMO (inventadas). Ninguna empresa es real.
-- Idempotente: borra primero las ofertas demo con estos mismos títulos y las vuelve a crear.
--   npm run db:seed-sql -- database/seed/ofertas_demo.sql
-- Ojo: si una oferta demo ya tiene postulaciones, se borran en cascada al re-ejecutar.
-- ============================================================================
BEGIN;

DELETE FROM jobs WHERE is_demo = true AND title IN (
  'Digitador de facturación',
  'Asistente contable',
  'Operador de monitoreo de cámaras',
  'Operario de ensamblaje de calzado',
  'Agente de servicio al cliente telefónico',
  'Transcriptor de entrevistas y podcasts',
  'Masoterapeuta',
  'Pasante de pruebas de accesibilidad web',
  'Auxiliar de cocina',
  'Diseñador gráfico junior',
  'Operario de bodega',
  'Digitador de inventario',
  'Empacador de supermercado',
  'Auxiliar de panadería',
  'Reponedor de perchas',
  'Pasante de vivero y jardinería',
  'Moderador de contenido digital',
  'Redactor de descripciones de productos',
  'Asistente de archivo documental',
  'Asesor de ventas por chat bilingüe'
);

INSERT INTO jobs (
  title, company, city, province, modality, schedule, salary_min, salary_max, daily_hours,
  summary, description, requirements, accommodations_detail, salary_benefits, easy_read,
  compatible_disabilities, physical_demands, accommodations_offered, keywords, min_education,
  is_active, is_demo
) VALUES
-- ─── Física ─────────────────────────────────────────────────────────────────
(
  'Digitador de facturación', 'Distribuidora Costa Verde S.A.', 'Guayaquil', 'guayas', 'onSite'::job_modality, 'fullTime'::job_schedule, 500, 600, 8,
  'Ingresas facturas al sistema desde un puesto sentado y accesible.',
  'Registras facturas de proveedores en el sistema contable, revisas que los valores cuadren y archivas los respaldos digitales. La oficina está en planta baja, con rampa y baño adaptado.',
  ARRAY['Bachillerato completo', 'Manejo básico de computadora', 'Rapidez y orden al digitar'],
  ARRAY['Oficina en planta baja con rampa y baño adaptado', 'Escritorio a la altura de silla de ruedas', 'Teclado adaptado si lo necesitas'],
  'Entre $500 y $600 al mes, afiliación al IESS desde el primer día, décimo tercero y décimo cuarto sueldo.',
  '{"jobTitle":"Trabajo: pasar facturas a la computadora","whatYouDo":["Escribes datos de facturas en la computadora.","Revisas que los números estén bien."],"whereAndWhen":["Trabajas en una oficina en Guayaquil.","De lunes a viernes.","8 horas cada día."],"pay":["Ganas entre 500 y 600 dólares cada mes."],"whatYouGet":["La oficina tiene rampa.","Trabajas sentado.","Tienes seguro del IESS."],"whatYouNeed":["Haber terminado el colegio.","Saber usar la computadora."]}'::jsonb,
  ARRAY['physical','hearing','psychosocial'], ARRAY['seeScreen'], ARRAY['seated','ramp','adaptedKeyboard'],
  ARRAY['digitacion','computacion','facturacion'], 'highSchool'::education_level, true, true
),
(
  'Asistente contable', 'Contadores Andinos Cía. Ltda.', 'Quito', 'pichincha', 'hybrid'::job_modality, 'fullTime'::job_schedule, 750, 950, 8,
  'Apoyas en conciliaciones y declaraciones al SRI. Tres días desde casa.',
  'Preparas conciliaciones bancarias, anexos transaccionales y borradores de declaraciones al SRI. Vas a la oficina dos días por semana; el edificio tiene ascensor y parqueadero preferencial.',
  ARRAY['Título técnico o estudios en contabilidad', 'Excel intermedio (tablas dinámicas, BUSCARV)', 'Conocer el portal del SRI es un plus'],
  ARRAY['Edificio con ascensor y parqueadero preferencial', 'Tres días de teletrabajo por semana', 'Silla ergonómica en casa y en oficina'],
  'Entre $750 y $950 al mes, IESS, décimos, fondos de reserva desde el segundo año.',
  '{"jobTitle":"Trabajo: ayudar con las cuentas de empresas","whatYouDo":["Ordenas cuentas en Excel.","Ayudas a preparar papeles para el SRI."],"whereAndWhen":["Trabajas 3 días en tu casa.","Vas 2 días a la oficina en Quito.","8 horas cada día."],"pay":["Ganas entre 750 y 950 dólares cada mes."],"whatYouGet":["El edificio tiene ascensor.","Tienes seguro del IESS."],"whatYouNeed":["Haber estudiado contabilidad.","Saber usar Excel."]}'::jsonb,
  ARRAY['physical','hearing','psychosocial'], ARRAY['seeScreen'], ARRAY['seated','ramp','flexibleSchedule'],
  ARRAY['excel','contabilidad','computacion'], 'technical'::education_level, true, true
),
(
  'Operador de monitoreo de cámaras', 'Vigilancia Austral Cía. Ltda.', 'Cuenca', 'azuay', 'onSite'::job_modality, 'fullTime'::job_schedule, 520, 620, 8,
  'Vigilas cámaras de seguridad desde la central y reportas novedades por radio y chat.',
  'Monitoreas cámaras de conjuntos residenciales desde la central, registras novedades en la bitácora digital y avisas al supervisor. Turnos rotativos de 8 horas, siempre sentado.',
  ARRAY['Bachillerato completo', 'Atención al detalle', 'Disponibilidad para turnos rotativos'],
  ARRAY['Central en planta baja con rampa', 'Puesto sentado con pantallas a la altura de la vista', 'Reportes por chat además de radio'],
  'Entre $520 y $620 al mes, recargo nocturno, IESS y décimos de ley.',
  '{"jobTitle":"Trabajo: mirar cámaras de seguridad","whatYouDo":["Miras cámaras en pantallas.","Avisas si ves algo raro."],"whereAndWhen":["Trabajas en una oficina en Cuenca.","Los turnos cambian cada semana.","8 horas cada día."],"pay":["Ganas entre 520 y 620 dólares cada mes."],"whatYouGet":["Trabajas sentado.","La oficina tiene rampa.","Tienes seguro del IESS."],"whatYouNeed":["Haber terminado el colegio.","Poner mucha atención."]}'::jsonb,
  ARRAY['physical','hearing'], ARRAY['seeScreen'], ARRAY['seated','ramp'],
  ARRAY['seguridad','monitoreo','computacion'], 'highSchool'::education_level, true, true
),
(
  'Operario de ensamblaje de calzado', 'Calzado Tungurahua Artesanal', 'Ambato', 'tungurahua', 'onSite'::job_modality, 'partTime'::job_schedule, 470, 520, 6,
  'Armas y empacas zapatos en mesa de trabajo sentado. Medio tiempo.',
  'Pegas plantillas, colocas cordones y empacas pares de zapatos en una mesa adaptada. Taller de una sola planta con accesos amplios.',
  ARRAY['Primaria completa', 'Habilidad manual', 'Ganas de aprender'],
  ARRAY['Taller de una planta con puertas amplias y rampa', 'Mesa de trabajo regulable para silla de ruedas', 'Capacitación en el puesto'],
  'Entre $470 y $520 al mes (proporcional a 6 horas), IESS y décimos.',
  '{"jobTitle":"Trabajo: armar zapatos","whatYouDo":["Pegas partes de zapatos.","Pones los zapatos en cajas."],"whereAndWhen":["Trabajas en un taller en Ambato.","De lunes a viernes.","6 horas cada día."],"pay":["Ganas entre 470 y 520 dólares cada mes."],"whatYouGet":["Trabajas sentado.","El taller tiene rampa.","Te enseñan el trabajo."],"whatYouNeed":["Saber usar tus manos con cuidado."]}'::jsonb,
  ARRAY['physical','hearing','intellectual'], ARRAY['bothHands'], ARRAY['seated','ramp','signLanguage'],
  ARRAY['manualidades','ensamblaje','empaque'], 'primary'::education_level, true, true
),
-- ─── Visual ─────────────────────────────────────────────────────────────────
(
  'Agente de servicio al cliente telefónico', 'Conecta Ecuador Contact Center', 'Quito', 'pichincha', 'onSite'::job_modality, 'fullTime'::job_schedule, 530, 650, 8,
  'Atiendes llamadas de clientes con lector de pantalla y guiones accesibles.',
  'Respondes llamadas entrantes, resuelves dudas de facturación y registras casos en un CRM compatible con JAWS y NVDA. Capacitación pagada de dos semanas.',
  ARRAY['Bachillerato completo', 'Buena dicción y paciencia', 'Experiencia en atención al cliente (deseable)'],
  ARRAY['Lector de pantalla JAWS y NVDA instalado', 'Guiones en formato accesible', 'Acompañamiento para movilidad en la oficina el primer mes'],
  'Entre $530 y $650 al mes más bonos por calidad, IESS, décimos y alimentación.',
  '{"jobTitle":"Trabajo: contestar llamadas de clientes","whatYouDo":["Contestas el teléfono.","Ayudas a los clientes con sus dudas."],"whereAndWhen":["Trabajas en una oficina en Quito.","De lunes a viernes.","8 horas cada día."],"pay":["Ganas entre 530 y 650 dólares cada mes.","Puedes ganar bonos."],"whatYouGet":["La computadora tiene lector de pantalla.","Te dan almuerzo.","Tienes seguro del IESS."],"whatYouNeed":["Haber terminado el colegio.","Hablar claro y con paciencia."]}'::jsonb,
  ARRAY['visual','physical'], ARRAY['phoneSpeaking','hearing','seeScreen'], ARRAY['screenReader','seated','ramp'],
  ARRAY['atencion al cliente','callcenter','computacion'], 'highSchool'::education_level, true, true
),
(
  'Transcriptor de entrevistas y podcasts', 'Voces del Pacífico Media', 'Todo el país', NULL, 'remote'::job_modality, 'partTime'::job_schedule, 480, 650, 5,
  'Transcribes entrevistas y podcasts desde tu casa con lector de pantalla.',
  'Escuchas grabaciones de entrevistas y podcasts y las transcribes con buena ortografía. Usas un editor de texto compatible con lector de pantalla y entregas por lotes semanales.',
  ARRAY['Excelente ortografía', 'Buena audición y concentración', 'Computadora propia e internet estable'],
  ARRAY['Herramientas compatibles con NVDA y JAWS', 'Horario flexible con entregas semanales', 'Teletrabajo 100 %'],
  'Entre $480 y $650 al mes según volumen, contrato con IESS y décimos proporcionales.',
  '{"jobTitle":"Trabajo: escribir lo que escuchas","whatYouDo":["Escuchas grabaciones.","Escribes lo que dicen las personas."],"whereAndWhen":["Trabajas desde tu casa.","Tú eliges tu horario.","Unas 5 horas cada día."],"pay":["Ganas entre 480 y 650 dólares cada mes."],"whatYouGet":["Puedes usar lector de pantalla.","Horario flexible.","Seguro del IESS."],"whatYouNeed":["Escribir sin faltas.","Tener computadora e internet."]}'::jsonb,
  ARRAY['visual','physical','psychosocial'], ARRAY['hearing'], ARRAY['screenReader','flexibleSchedule','seated'],
  ARRAY['transcripcion','computacion','digitacion'], 'highSchool'::education_level, true, true
),
(
  'Masoterapeuta', 'Centro de Bienestar Río Tomebamba', 'Cuenca', 'azuay', 'onSite'::job_modality, 'fullTime'::job_schedule, 600, 800, 8,
  'Das masajes terapéuticos en un spa con espacios señalizados en relieve.',
  'Realizas masajes relajantes y terapéuticos con agenda organizada por recepción. El centro tiene señalética en braille, rutas libres de obstáculos y agenda por audio.',
  ARRAY['Certificado de masoterapia', 'Trato amable con clientes', 'Experiencia de 1 año (deseable)'],
  ARRAY['Señalética en braille y rutas sin obstáculos', 'Agenda de citas por mensaje de voz', 'Horario flexible para citas médicas'],
  'Entre $600 y $800 al mes más comisiones, IESS y décimos.',
  '{"jobTitle":"Trabajo: dar masajes","whatYouDo":["Das masajes a clientes.","Ayudas a que se sientan mejor."],"whereAndWhen":["Trabajas en un spa en Cuenca.","De martes a sábado.","8 horas cada día."],"pay":["Ganas entre 600 y 800 dólares cada mes.","Ganas un extra por cada cliente."],"whatYouGet":["El lugar tiene letreros en braille.","Te avisan tus citas por audio.","Seguro del IESS."],"whatYouNeed":["Haber estudiado masajes."]}'::jsonb,
  ARRAY['visual','hearing'], ARRAY['bothHands','standing'], ARRAY['flexibleSchedule','screenReader'],
  ARRAY['masajes','atencion al cliente','salud'], 'technical'::education_level, true, true
),
(
  'Pasante de pruebas de accesibilidad web', 'Inclusiva Digital S.A.S.', 'Todo el país', NULL, 'remote'::job_modality, 'internship'::job_schedule, 470, 470, 4,
  'Pruebas sitios web con lector de pantalla y reportas lo que no funciona.',
  'Navegas sitios y apps de clientes con NVDA o VoiceOver, documentas barreras de accesibilidad y propones mejoras junto al equipo de desarrollo. Pasantía de 6 meses con mentoría.',
  ARRAY['Estudiante de tecnología o carreras afines', 'Uso diario de lector de pantalla', 'Inglés básico de lectura'],
  ARRAY['Teletrabajo 100 %', 'Mentor asignado', 'Horario flexible compatible con clases'],
  'Pasantía pagada de $470 al mes con afiliación al IESS.',
  '{"jobTitle":"Pasantía: revisar si las páginas web son fáciles de usar","whatYouDo":["Usas páginas web con tu lector de pantalla.","Cuentas qué cosas no funcionan."],"whereAndWhen":["Trabajas desde tu casa.","4 horas cada día.","Tú eliges el horario."],"pay":["Ganas 470 dólares cada mes."],"whatYouGet":["Una persona te enseña.","Seguro del IESS."],"whatYouNeed":["Estar estudiando.","Usar lector de pantalla."]}'::jsonb,
  ARRAY['visual','physical','psychosocial'], ARRAY[]::text[], ARRAY['screenReader','flexibleSchedule','seated'],
  ARRAY['accesibilidad','computacion','ingles'], 'highSchool'::education_level, true, true
),
-- ─── Auditiva ───────────────────────────────────────────────────────────────
(
  'Auxiliar de cocina', 'Restaurante Sabor Manaba', 'Guayaquil', 'guayas', 'onSite'::job_modality, 'fullTime'::job_schedule, 480, 550, 8,
  'Preparas ingredientes en una cocina con pedidos en pantalla y compañeros que usan señas.',
  'Lavas, picas y porcionas ingredientes, armas platos sencillos y mantienes limpia la estación. Los pedidos llegan por pantalla y el jefe de cocina sabe lengua de señas ecuatoriana básica.',
  ARRAY['Primaria completa', 'Carnet de manipulación de alimentos (te ayudamos a sacarlo)', 'Gusto por la cocina'],
  ARRAY['Pedidos en pantalla, sin órdenes a gritos', 'Intérprete de lengua de señas en la inducción', 'Alarmas con luz en la cocina'],
  'Entre $480 y $550 al mes, alimentación, IESS y décimos.',
  '{"jobTitle":"Trabajo: ayudar en la cocina","whatYouDo":["Lavas y cortas alimentos.","Ayudas a preparar platos."],"whereAndWhen":["Trabajas en un restaurante en Guayaquil.","De martes a domingo.","8 horas cada día."],"pay":["Ganas entre 480 y 550 dólares cada mes."],"whatYouGet":["Te dan comida.","Los pedidos salen en una pantalla.","Hay intérprete de señas al empezar."],"whatYouNeed":["Saber cocinar un poco."]}'::jsonb,
  ARRAY['hearing','intellectual'], ARRAY['standing','bothHands'], ARRAY['signLanguage'],
  ARRAY['cocina','alimentos','limpieza'], 'primary'::education_level, true, true
),
(
  'Diseñador gráfico junior', 'Estudio Creativo Mitad del Mundo', 'Quito', 'pichincha', 'hybrid'::job_modality, 'fullTime'::job_schedule, 700, 900, 8,
  'Diseñas piezas para redes sociales. Reuniones con intérprete de señas y por chat.',
  'Creas publicaciones para redes, banners y presentaciones con Illustrator y Canva. Las indicaciones llegan por escrito en el gestor de tareas y las reuniones tienen intérprete de LSEC.',
  ARRAY['Título técnico o tecnológico en diseño', 'Portafolio con trabajos', 'Manejo de Illustrator y Photoshop'],
  ARRAY['Intérprete de lengua de señas en reuniones', 'Comunicación por chat y tareas escritas', 'Dos días de teletrabajo por semana'],
  'Entre $700 y $900 al mes, IESS, décimos y seguro médico privado.',
  '{"jobTitle":"Trabajo: hacer diseños para redes sociales","whatYouDo":["Haces imágenes en la computadora.","Las empresas las usan en redes sociales."],"whereAndWhen":["Trabajas 3 días en una oficina en Quito.","2 días desde tu casa.","8 horas cada día."],"pay":["Ganas entre 700 y 900 dólares cada mes."],"whatYouGet":["Intérprete de señas en las reuniones.","Seguro médico."],"whatYouNeed":["Haber estudiado diseño.","Mostrar tus trabajos."]}'::jsonb,
  ARRAY['hearing','physical','psychosocial'], ARRAY['seeScreen','bothHands'], ARRAY['signLanguage','seated','flexibleSchedule'],
  ARRAY['diseno','computacion','redes sociales'], 'technical'::education_level, true, true
),
(
  'Operario de bodega', 'Pesquera Puerto Manta S.A.', 'Manta', 'manabi', 'onSite'::job_modality, 'fullTime'::job_schedule, 500, 580, 8,
  'Recibes y ordenas mercadería en bodega con señales visuales de seguridad.',
  'Recibes cajas, verificas cantidades contra la guía, etiquetas y ordenas en perchas. La bodega usa semáforos y luces para avisos de montacargas.',
  ARRAY['Bachillerato completo', 'Buena condición física', 'Orden y puntualidad'],
  ARRAY['Alertas con luces en vez de pitos', 'Compañero guía las primeras semanas', 'Intérprete de señas para capacitación de seguridad'],
  'Entre $500 y $580 al mes, IESS, décimos y transporte.',
  '{"jobTitle":"Trabajo: ordenar cajas en una bodega","whatYouDo":["Recibes cajas.","Las cuentas y las pones en su lugar."],"whereAndWhen":["Trabajas en una bodega en Manta.","De lunes a viernes.","8 horas cada día."],"pay":["Ganas entre 500 y 580 dólares cada mes."],"whatYouGet":["Las alarmas son con luces.","Te llevan en bus de la empresa.","Seguro del IESS."],"whatYouNeed":["Haber terminado el colegio.","Poder cargar cajas."]}'::jsonb,
  ARRAY['hearing','intellectual'], ARRAY['standing','walkingDriving','bothHands'], ARRAY['signLanguage'],
  ARRAY['bodega','inventario','empaque'], 'highSchool'::education_level, true, true
),
(
  'Digitador de inventario', 'Comercial Sur Lojano Cía. Ltda.', 'Loja', 'loja', 'onSite'::job_modality, 'fullTime'::job_schedule, 480, 560, 8,
  'Registras entradas y salidas de productos en Excel. Todo por escrito.',
  'Actualizas el inventario en Excel y en el sistema de la empresa, cruzas reportes con bodega y preparas resúmenes semanales. La comunicación con el equipo es por WhatsApp y correo.',
  ARRAY['Bachillerato completo', 'Excel básico', 'Orden con los números'],
  ARRAY['Comunicación escrita (WhatsApp, correo)', 'Intérprete de señas en la entrevista', 'Puesto sentado'],
  'Entre $480 y $560 al mes, IESS y décimos.',
  '{"jobTitle":"Trabajo: anotar productos en la computadora","whatYouDo":["Anotas qué productos entran y salen.","Usas Excel."],"whereAndWhen":["Trabajas en una oficina en Loja.","De lunes a viernes.","8 horas cada día."],"pay":["Ganas entre 480 y 560 dólares cada mes."],"whatYouGet":["Te hablan por escrito.","Trabajas sentado.","Seguro del IESS."],"whatYouNeed":["Haber terminado el colegio.","Saber Excel básico."]}'::jsonb,
  ARRAY['hearing','physical','psychosocial'], ARRAY['seeScreen'], ARRAY['signLanguage','seated'],
  ARRAY['excel','inventario','digitacion'], 'highSchool'::education_level, true, true
),
-- ─── Intelectual ────────────────────────────────────────────────────────────
(
  'Empacador de supermercado', 'Supermercados La Canasta del Puerto', 'Guayaquil', 'guayas', 'onSite'::job_modality, 'partTime'::job_schedule, 470, 500, 6,
  'Empacas las compras de los clientes en caja. Tareas simples con apoyo de un compañero guía.',
  'Empacas productos en fundas o cajas en la línea de caja, ayudas a llevar las compras al carrito y mantienes ordenado tu puesto. Tienes un compañero guía y los pasos del trabajo en tarjetas con dibujos.',
  ARRAY['Ganas de trabajar', 'Trato amable', 'No se necesita experiencia'],
  ARRAY['Compañero guía (empleo con apoyo)', 'Instrucciones con dibujos', 'Horario flexible para terapias'],
  'Entre $470 y $500 al mes (6 horas), IESS, décimos y descuento en compras.',
  '{"jobTitle":"Trabajo: poner las compras en fundas","whatYouDo":["Pones las compras de la gente en fundas.","Saludas a los clientes."],"whereAndWhen":["Trabajas en un supermercado en Guayaquil.","6 horas cada día.","Puedes cambiar tu horario si tienes terapia."],"pay":["Ganas entre 470 y 500 dólares cada mes."],"whatYouGet":["Un compañero te ayuda.","Te explican con dibujos.","Seguro del IESS."],"whatYouNeed":["Ganas de trabajar.","Ser amable."]}'::jsonb,
  ARRAY['intellectual','hearing'], ARRAY['standing','bothHands'], ARRAY['flexibleSchedule'],
  ARRAY['empaque','atencion al cliente'], NULL, true, true
),
(
  'Auxiliar de panadería', 'Panificadora El Trigal Cuencano', 'Cuenca', 'azuay', 'onSite'::job_modality, 'partTime'::job_schedule, 470, 520, 5,
  'Ayudas a preparar pan y a ordenar la vitrina. Pasos sencillos y siempre los mismos.',
  'Pesas ingredientes con balanza digital, formas panes, los pones en bandejas y ordenas la vitrina. Las recetas están en láminas con fotos paso a paso.',
  ARRAY['Gusto por la cocina', 'Higiene personal', 'Primaria (deseable)'],
  ARRAY['Recetas con fotos paso a paso', 'Supervisor con formación en inclusión', 'Horario flexible'],
  'Entre $470 y $520 al mes, IESS, décimos y pan para llevar a casa.',
  '{"jobTitle":"Trabajo: ayudar a hacer pan","whatYouDo":["Pesas harina y otras cosas.","Haces panes con las manos.","Ordenas la vitrina."],"whereAndWhen":["Trabajas en una panadería en Cuenca.","5 horas cada día, en la mañana."],"pay":["Ganas entre 470 y 520 dólares cada mes."],"whatYouGet":["Las recetas tienen fotos.","Te llevas pan a casa.","Seguro del IESS."],"whatYouNeed":["Lavarte bien las manos.","Ganas de aprender."]}'::jsonb,
  ARRAY['intellectual','hearing','psychosocial'], ARRAY['standing','bothHands'], ARRAY['flexibleSchedule'],
  ARRAY['cocina','panaderia','alimentos'], NULL, true, true
),
(
  'Reponedor de perchas', 'Mercado Mayorista Ambateño S.A.', 'Ambato', 'tungurahua', 'onSite'::job_modality, 'fullTime'::job_schedule, 470, 540, 8,
  'Llenas las perchas con productos y revisas que estén ordenados por colores y fotos.',
  'Sacas productos de bodega, los colocas en la percha que indica la foto del planograma y retiras los que están vencidos. Trabajas con un compañero de apoyo.',
  ARRAY['Ganas de trabajar', 'Puntualidad', 'No se necesita experiencia'],
  ARRAY['Planogramas con fotos y colores', 'Compañero de apoyo', 'Horario flexible para citas médicas'],
  'Entre $470 y $540 al mes, IESS y décimos.',
  '{"jobTitle":"Trabajo: llenar perchas en un mercado","whatYouDo":["Pones productos en las perchas.","Miras la foto para saber dónde va cada cosa."],"whereAndWhen":["Trabajas en un mercado en Ambato.","De lunes a viernes.","8 horas cada día."],"pay":["Ganas entre 470 y 540 dólares cada mes."],"whatYouGet":["Un compañero te ayuda.","Seguro del IESS."],"whatYouNeed":["Llegar a tiempo.","Ganas de trabajar."]}'::jsonb,
  ARRAY['intellectual','hearing'], ARRAY['standing','walkingDriving','bothHands'], ARRAY['flexibleSchedule'],
  ARRAY['reposicion','empaque','ventas'], NULL, true, true
),
(
  'Pasante de vivero y jardinería', 'Vivero Jardines del Zamora', 'Loja', 'loja', 'onSite'::job_modality, 'internship'::job_schedule, 470, 470, 4,
  'Aprendes a cuidar plantas en un vivero. Pasantía de 6 meses con tutor.',
  'Riegas, trasplantas y etiquetas plantas en un vivero al aire libre. Un tutor te enseña cada tarea y te entrega un certificado al terminar.',
  ARRAY['Gusto por las plantas', 'Ganas de aprender', 'No se necesita experiencia'],
  ARRAY['Tutor durante toda la pasantía', 'Instrucciones con dibujos', 'Horario flexible'],
  'Pasantía pagada de $470 al mes con IESS y certificado de práctica laboral.',
  '{"jobTitle":"Pasantía: cuidar plantas","whatYouDo":["Riegas las plantas.","Las cambias de maceta.","Les pones etiquetas."],"whereAndWhen":["Trabajas en un vivero en Loja.","4 horas cada día, en la mañana.","Dura 6 meses."],"pay":["Ganas 470 dólares cada mes."],"whatYouGet":["Una persona te enseña.","Te dan un certificado.","Seguro del IESS."],"whatYouNeed":["Que te gusten las plantas."]}'::jsonb,
  ARRAY['intellectual','psychosocial','hearing'], ARRAY['standing','walkingDriving','bothHands'], ARRAY['flexibleSchedule'],
  ARRAY['jardineria','manualidades','plantas'], NULL, true, true
),
-- ─── Psicosocial ────────────────────────────────────────────────────────────
(
  'Moderador de contenido digital', 'Comunidad Digital Andina S.A.', 'Todo el país', NULL, 'remote'::job_modality, 'partTime'::job_schedule, 550, 700, 6,
  'Revisas comentarios en redes de marcas locales desde casa, con pausas y horario flexible.',
  'Revisas comentarios y mensajes en redes sociales de marcas de consumo, ocultas spam y derivas consultas al equipo de atención. No incluye contenido violento. Metas diarias realistas y pausas activas.',
  ARRAY['Bachillerato completo', 'Uso de redes sociales y computadora', 'Buena redacción'],
  ARRAY['Teletrabajo 100 %', 'Horario flexible en franjas', 'Acompañamiento psicológico gratuito'],
  'Entre $550 y $700 al mes, IESS y décimos.',
  '{"jobTitle":"Trabajo: revisar comentarios en redes sociales","whatYouDo":["Lees comentarios en redes sociales.","Borras los mensajes basura."],"whereAndWhen":["Trabajas desde tu casa.","6 horas cada día.","Tú eliges tu horario."],"pay":["Ganas entre 550 y 700 dólares cada mes."],"whatYouGet":["Puedes hablar con un psicólogo gratis.","Haces pausas.","Seguro del IESS."],"whatYouNeed":["Haber terminado el colegio.","Saber usar redes sociales."]}'::jsonb,
  ARRAY['psychosocial','physical','hearing'], ARRAY['seeScreen'], ARRAY['flexibleSchedule','seated'],
  ARRAY['redes sociales','computacion','atencion al cliente'], 'highSchool'::education_level, true, true
),
(
  'Redactor de descripciones de productos', 'Tienda Online Sierra y Mar', 'Todo el país', NULL, 'remote'::job_modality, 'partTime'::job_schedule, 500, 650, 4,
  'Escribes descripciones de productos para una tienda en línea. Entregas por lotes, sin llamadas.',
  'Redactas fichas de productos (artesanías, ropa, alimentos) para la tienda en línea a partir de fotos y datos del proveedor. Trabajo asincrónico: sin reuniones diarias ni llamadas.',
  ARRAY['Buena ortografía y redacción', 'Computadora e internet', 'Inglés intermedio (deseable)'],
  ARRAY['Trabajo asincrónico, sin llamadas', 'Horario flexible', 'Lector de pantalla compatible con la plataforma'],
  'Entre $500 y $650 al mes, contrato con IESS y décimos proporcionales.',
  '{"jobTitle":"Trabajo: escribir sobre productos","whatYouDo":["Escribes cómo es cada producto.","La tienda lo pone en internet."],"whereAndWhen":["Trabajas desde tu casa.","4 horas cada día.","Tú eliges cuándo."],"pay":["Ganas entre 500 y 650 dólares cada mes."],"whatYouGet":["No tienes que hacer llamadas.","Horario flexible.","Seguro del IESS."],"whatYouNeed":["Escribir bien.","Tener computadora e internet."]}'::jsonb,
  ARRAY['psychosocial','visual','hearing','physical'], ARRAY[]::text[], ARRAY['flexibleSchedule','screenReader','seated'],
  ARRAY['redaccion','computacion','ingles','artesania'], 'highSchool'::education_level, true, true
),
(
  'Asistente de archivo documental', 'Notaría Integral del Norte', 'Quito', 'pichincha', 'hybrid'::job_modality, 'fullTime'::job_schedule, 520, 620, 7,
  'Escaneas y organizas documentos en un ambiente tranquilo, con días desde casa.',
  'Digitalizas expedientes, los nombras según el protocolo y los subes al archivo digital. Oficina silenciosa, tareas claras y metas semanales. Dos días por semana trabajas desde casa indexando documentos.',
  ARRAY['Bachillerato completo', 'Computación básica', 'Orden y confidencialidad'],
  ARRAY['Ambiente silencioso y sin atención al público', 'Horario flexible para citas médicas', 'Dos días de teletrabajo'],
  'Entre $520 y $620 al mes, IESS y décimos.',
  '{"jobTitle":"Trabajo: ordenar documentos","whatYouDo":["Pasas papeles por el escáner.","Guardas los archivos en la computadora."],"whereAndWhen":["Trabajas 3 días en una oficina en Quito.","2 días desde tu casa.","7 horas cada día."],"pay":["Ganas entre 520 y 620 dólares cada mes."],"whatYouGet":["La oficina es tranquila.","Puedes ir a tus citas médicas.","Seguro del IESS."],"whatYouNeed":["Haber terminado el colegio.","Saber usar la computadora."]}'::jsonb,
  ARRAY['psychosocial','hearing','physical','intellectual'], ARRAY['seeScreen','bothHands'], ARRAY['flexibleSchedule','seated','ramp'],
  ARRAY['archivo','computacion','digitacion'], 'highSchool'::education_level, true, true
),
(
  'Asesor de ventas por chat bilingüe', 'Viajes Galápagos Azul Cía. Ltda.', 'Todo el país', NULL, 'remote'::job_modality, 'fullTime'::job_schedule, 900, 1400, 8,
  'Vendes paquetes turísticos por chat en español e inglés. Sin llamadas en frío.',
  'Respondes por chat y correo a turistas que piden información de tours a Galápagos y la Sierra, armas cotizaciones y cierras ventas. Comisiones sobre metas alcanzables y horario por bloques que tú eliges.',
  ARRAY['Inglés avanzado escrito', 'Experiencia en ventas o turismo', 'Título técnico o universitario'],
  ARRAY['Solo chat y correo, sin llamadas', 'Horario flexible por bloques', 'Teletrabajo 100 %'],
  'Entre $900 y $1.400 al mes con comisiones, IESS, décimos y fondos de reserva.',
  '{"jobTitle":"Trabajo: vender viajes por chat","whatYouDo":["Respondes mensajes de turistas.","Les vendes viajes."],"whereAndWhen":["Trabajas desde tu casa.","8 horas cada día.","Tú eliges tus horas."],"pay":["Ganas entre 900 y 1.400 dólares cada mes.","Ganas más si vendes más."],"whatYouGet":["No haces llamadas.","Seguro del IESS."],"whatYouNeed":["Escribir bien en inglés.","Saber vender."]}'::jsonb,
  ARRAY['psychosocial','hearing','physical','visual'], ARRAY[]::text[], ARRAY['flexibleSchedule','screenReader','signLanguage'],
  ARRAY['ventas','ingles','atencion al cliente','turismo'], 'technical'::education_level, true, true
);

COMMIT;
