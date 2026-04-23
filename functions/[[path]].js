// functions/[[path]].js
// Cloudflare Pages Function para Open Graph dinámico

// Configuración de Firebase
const FIREBASE_CONFIG = {
  databaseURL: "https://galloslivebadge-default-rtdb.firebaseio.com",
  apiKey: "AIzaSyASox7mRak5V0py29htEVWCVeipGpA0yfs"
};

const BLOG_BASE_URL = "https://legadoavicola.blogspot.com";
const DEFAULT_OG_IMAGE = "https://res.cloudinary.com/davovja1g/image/upload/v1769121460/tournament-tables/nnskzwln1mxbkiwehxx0.jpg?t=1769121461098"; // Cambia por una imagen real

// ========== DETECCIÓN DE ROBOTS SOCIALES ==========
function isSocialBot(userAgent) {
  const bots = [
    'facebookexternalhit', 'facebot', 'twitterbot', 'whatsapp',
    'linkedinbot', 'slackbot', 'telegrambot', 'discordbot',
    'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
    'yandexbot', 'applebot', 'rogerbot', 'embedly', 'quora link preview',
    'showyoubot', 'outbrain', 'pinterest', 'vkshare',
    'w3c_validator', 'redditbot', 'pocket', 'bitlybot'
  ];
  
  const ua = userAgent.toLowerCase();
  return bots.some(bot => ua.includes(bot));
}

// ========== CONSULTA A FIREBASE REALTIME DATABASE ==========
async function getImageFromFirebase(section, id) {
  const dbUrl = FIREBASE_CONFIG.databaseURL;
  
  try {
    console.log(`🔍 Buscando en Firebase: section=${section}, id=${id}`);
    
    // Caso 1: Torneos Rooster - ?section=rooster&t={torneoId}
    if (section === 'rooster' && id) {
      // Buscar en /TORNEOS/{uid_creador}/{torneoId}
      const url = `${dbUrl}/TORNEOS.json`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data) {
        for (const creatorId in data) {
          const torneos = data[creatorId];
          for (const torneoId in torneos) {
            if (torneoId === id || torneos[torneoId].id === id) {
              const imagen = torneos[torneoId].imagen;
              if (imagen && (imagen.endsWith('.jpg') || imagen.endsWith('.png') || imagen.endsWith('.jpeg') || imagen.startsWith('http'))) {
                console.log(`✅ Imagen encontrada para torneo ${id}: ${imagen}`);
                return imagen;
              }
            }
          }
        }
      }
    }
    
    // Caso 2: Ventas/Subastas - ?section=ventas&v={tablaId}
    if (section === 'ventas' && id) {
      // Buscar en /VENTAS/{uid_creador}/{tablaId}
      const url = `${dbUrl}/VENTAS.json`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data) {
        for (const creatorId in data) {
          const ventas = data[creatorId];
          for (const ventaId in ventas) {
            if (ventaId === id || ventas[ventaId].id === id || ventas[ventaId].tablaId === id) {
              const imagen = ventas[ventaId].imagen;
              if (imagen && (imagen.endsWith('.jpg') || imagen.endsWith('.png') || imagen.endsWith('.jpeg') || imagen.startsWith('http'))) {
                console.log(`✅ Imagen encontrada para venta ${id}: ${imagen}`);
                return imagen;
              }
            }
          }
        }
      }
    }
    
    // Caso 3: Posts Compartidos - ?share={postId}
    if (section === 'share' && id) {
      // Buscar en /posts/{postId}
      const url = `${dbUrl}/posts/${id}.json`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data) {
        // Priorizar imageUrl, luego imagen
        const imagen = data.imageUrl || data.imagen;
        if (imagen && (imagen.endsWith('.jpg') || imagen.endsWith('.png') || imagen.endsWith('.jpeg') || imagen.startsWith('http'))) {
          console.log(`✅ Imagen encontrada para post ${id}: ${imagen}`);
          return imagen;
        }
      }
    }
    
    // Caso 4: URL directa con parámetro 'img' (fallback)
    return null;
    
  } catch (error) {
    console.error('❌ Error consultando Firebase:', error);
    return null;
  }
}

// ========== OBTENER TÍTULO Y DESCRIPCIÓN SEGÚN EL TIPO ==========
async function getMetadataFromFirebase(section, id) {
  const dbUrl = FIREBASE_CONFIG.databaseURL;
  
  try {
    // Rooster - Torneos
    if (section === 'rooster' && id) {
      const url = `${dbUrl}/TORNEOS.json`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data) {
        for (const creatorId in data) {
          const torneos = data[creatorId];
          for (const torneoId in torneos) {
            if (torneoId === id || torneos[torneoId].id === id) {
              const torneo = torneos[torneoId];
              return {
                title: torneo.nombre || `Torneo de Gallos - ${torneo.palenque || 'Legado Avícola'}`,
                description: `${torneo.organizador || 'Organizador'} | ${torneo.fecha || 'Fecha por confirmar'} | Lugar: ${torneo.lugar || torneo.palenque || 'Por definir'}`
              };
            }
          }
        }
      }
    }
    
    // Ventas
    if (section === 'ventas' && id) {
      const url = `${dbUrl}/VENTAS.json`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data) {
        for (const creatorId in data) {
          const ventas = data[creatorId];
          for (const ventaId in ventas) {
            if (ventaId === id || ventas[ventaId].id === id || ventas[ventaId].tablaId === id) {
              const venta = ventas[ventaId];
              return {
                title: venta.titulo || `Venta de Aves - ${venta.palenque || 'Legado Avícola'}`,
                description: `${venta.organizador || 'Vendedor'} | ${venta.fecha || 'Fecha por confirmar'} | ${venta.descuento ? `🔖 ${venta.descuento}% descuento` : 'Consultar disponibilidad'}`
              };
            }
          }
        }
      }
    }
    
    // Share Posts
    if (section === 'share' && id) {
      const url = `${dbUrl}/posts/${id}.json`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data) {
        let descripcion = data.descripcion || '';
        if (descripcion.length > 150) descripcion = descripcion.substring(0, 147) + '...';
        
        return {
          title: data.nombreTorneo || `Publicación de ${data.userName || 'Usuario'}`,
          description: descripcion || `${data.clubOrganizador || 'Legado Avícola'} | ${data.fechaTorneo || 'Fecha por confirmar'}`
        };
      }
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Error obteniendo metadata:', error);
    return null;
  }
}

// ========== GENERAR HTML CON OG TAGS ==========
function generateOgHtml(requestUrl, imageUrl, metadata, section, id) {
  const title = metadata?.title || 'Legado Avícola - Portal Avícola Profesional';
  const description = metadata?.description || 'Portal avícola profesional - Guías, manejo y sanidad aviar';
  const finalImageUrl = imageUrl || DEFAULT_OG_IMAGE;
  
  // Construir URL de redirección para usuarios reales
  const redirectUrl = `${BLOG_BASE_URL}?section=${section || ''}${id ? (section === 'share' ? `&share=${id}` : `&${section === 'rooster' ? 't' : 'v'}=${id}`) : ''}`;
  
  return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    
    <!-- OPEN GRAPH PARA FACEBOOK, WHATSAPP, TWITTER -->
    <meta property="og:title" content="${escapeHtml(title)}">
    <meta property="og:description" content="${escapeHtml(description)}">
    <meta property="og:image" content="${finalImageUrl}">
    <meta property="og:image:width" content="512">
    <meta property="og:image:height" content="512">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:secure_url" content="${finalImageUrl}">
    <meta property="og:url" content="${requestUrl}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Legado Avícola">
    <meta property="og:locale" content="es_MX">
    
    <!-- TWITTER CARDS -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(title)}">
    <meta name="twitter:description" content="${escapeHtml(description)}">
    <meta name="twitter:image" content="${finalImageUrl}">
    
    <!-- WHATSAPP SPECIFIC -->
    <meta property="og:image:alt" content="${escapeHtml(title)}">
    
    <!-- REDIRECCIÓN PARA USUARIOS REALES -->
    <meta http-equiv="refresh" content="0; url=${redirectUrl}">
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #f5f5f5;
        }
        .container {
            text-align: center;
            padding: 20px;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #e0e0e0;
            border-top: 4px solid #2E7D32;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 20px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        p { color: #666; }
        a { color: #2E7D32; text-decoration: none; }
        .preview-image {
            max-width: 300px;
            margin: 20px auto;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <p>Redirigiendo a Legado Avícola...</p>
        <p><small>Si no eres redirigido automáticamente, <a href="${redirectUrl}">haz clic aquí</a></small></p>
    </div>
    <script>
        // Redirección JavaScript de respaldo
        if (!navigator.userAgent.match(/facebook|whatsapp|twitter|bot|crawler/i)) {
            window.location.href = "${redirectUrl}";
        }
    </script>
</body>
</html>`;
}

// ========== ESCAPE HTML ==========
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ========== HANDLER PRINCIPAL ==========
export async function onRequest(context) {
  const { request, env, params, waitUntil } = context;
  const url = new URL(request.url);
  const userAgent = request.headers.get('User-Agent') || '';
  
  // Obtener parámetros de la URL
  const section = url.searchParams.get('section');
  const torneoId = url.searchParams.get('t');
  const ventaId = url.searchParams.get('v');
  const shareId = url.searchParams.get('share');
  
  // Determinar qué tipo de contenido es
  let contentType = null;
  let contentId = null;
  
  if (section === 'rooster' && torneoId) {
    contentType = 'rooster';
    contentId = torneoId;
  } else if (section === 'ventas' && ventaId) {
    contentType = 'ventas';
    contentId = ventaId;
  } else if (shareId) {
    contentType = 'share';
    contentId = shareId;
  }
  
  // Si es un robot social Y hay un ID válido, mostrar OG tags
  if (isSocialBot(userAgent) && contentType && contentId) {
    console.log(`🤖 Robot detectado: ${userAgent.substring(0, 100)}`);
    console.log(`📦 Buscando contenido: ${contentType} / ${contentId}`);
    
    // Obtener la imagen desde Firebase
    const imageUrl = await getImageFromFirebase(contentType, contentId);
    const metadata = await getMetadataFromFirebase(contentType, contentId);
    
    console.log(`🖼️ Imagen obtenida: ${imageUrl || 'no encontrada, usando default'}`);
    
    // Generar HTML con los metadatos
    const html = generateOgHtml(url.href, imageUrl, metadata, contentType, contentId);
    
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache por 5 minutos
        'X-Robots-Tag': 'noindex' // No indexar esta página temporal
      }
    });
  }
  
  // Para usuarios reales, redirigir al blog con los parámetros
  let redirectParams = '';
  if (section === 'rooster' && torneoId) redirectParams = `?section=rooster&t=${torneoId}`;
  else if (section === 'ventas' && ventaId) redirectParams = `?section=ventas&v=${ventaId}`;
  else if (shareId) redirectParams = `?share=${shareId}`;
  else if (section === 'public') redirectParams = '?section=public';
  else if (section === 'admin') redirectParams = '?section=admin';
  
  const redirectUrl = `${BLOG_BASE_URL}${redirectParams || ''}`;
  
  return Response.redirect(redirectUrl, 302);
}

// También exportar para compatibilidad con diferentes versiones de Pages
export async function onRequestGet(context) {
  return onRequest(context);
}

export async function onRequestPost(context) {
  return onRequest(context);
}
