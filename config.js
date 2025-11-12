document.addEventListener('DOMContentLoaded', () => {
  const inputs = {
    whatsapp: document.getElementById('whatsappInput'),
    phone: document.getElementById('phoneInput'),
    instagram: document.getElementById('instagramInput'),
    facebook: document.getElementById('facebookInput'),
    email: document.getElementById('emailInput'),
    bgColor: document.getElementById('bgColorInput'),
    btnColor: document.getElementById('btnColorInput'),
    textColor: document.getElementById('textColorInput'),
    logoStore: document.getElementById('logoStoreInput'),
    logoSearch: document.getElementById('logoSearchInput'),
    whatsappMessage: document.getElementById('whatsappMessageInput'),
  };

  const toggles = {
    whatsapp: document.getElementById('showWhatsapp'),
    telefono: document.getElementById('showTelefono'),
    instagram: document.getElementById('showInstagram'),
    facebook: document.getElementById('showFacebook'),
    email: document.getElementById('showEmail'),
    map: document.getElementById('showMap'),
  };

  const addressDisplay = document.getElementById('addressDisplay');
  const saveBtn = document.getElementById('saveBtn');
  const saveLocalBtn = document.getElementById('saveLocalBtn');

  const logoStorePreview = document.getElementById('logoStorePreview');
  const logoSearchPreview = document.getElementById('logoSearchPreview');
  const logoStoreEditBtn = document.querySelector('#logoStoreContainer .edit-btn');
  const logoSearchEditBtn = document.querySelector('#logoSearchContainer .edit-btn');

  // Valores de lat/lng por defecto
  let currentLat = parseFloat(localStorage.getItem('lat')) || -32.0;
  let currentLng = parseFloat(localStorage.getItem('lng')) || -64.0;

  // Cargar valores previos desde localStorage (opcional)
  inputs.whatsapp.value = localStorage.getItem('whatsappNumber') || '';
  inputs.phone.value = localStorage.getItem('phoneNumber') || '';
  inputs.instagram.value = localStorage.getItem('instagramLink') || '';
  inputs.facebook.value = localStorage.getItem('facebookLink') || '';
  inputs.email.value = localStorage.getItem('emailAddress') || '';
  inputs.bgColor.value = localStorage.getItem('bgColor') || '#ffffff';
  inputs.btnColor.value = localStorage.getItem('btnColor') || '#28a745';
  inputs.textColor.value = localStorage.getItem('textColor') || '#000000';
  logoStorePreview.src = localStorage.getItem('logoStore') || '';
  logoSearchPreview.src = localStorage.getItem('logoSearch') || '';
  addressDisplay.textContent = localStorage.getItem('address') || 'Ubicación no definida';
  inputs.whatsappMessage.value = localStorage.getItem('whatsappMessage') || '';

  try {
    toggles.whatsapp.checked = localStorage.getItem('showWhatsapp') === 'true';
    toggles.telefono.checked = localStorage.getItem('showTelefono') === 'true';
    toggles.instagram.checked = localStorage.getItem('showInstagram') === 'true';
    toggles.facebook.checked = localStorage.getItem('showFacebook') === 'true';
    toggles.email.checked = localStorage.getItem('showEmail') === 'true';
    toggles.map.checked = localStorage.getItem('showMap') === 'true';
  } catch (e) {
    console.warn('Error cargando toggles', e);
  }

  // Click en lápiz abre input file
  if (logoStoreEditBtn) logoStoreEditBtn.addEventListener('click', () => inputs.logoStore.click());
  if (logoSearchEditBtn) logoSearchEditBtn.addEventListener('click', () => inputs.logoSearch.click());

  // Previsualizar cambio de logo usando objectURL (rápido)
  if (inputs.logoStore) {
    inputs.logoStore.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      logoStorePreview.src = URL.createObjectURL(file);
    });
  }
  if (inputs.logoSearch) {
    inputs.logoSearch.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      logoSearchPreview.src = URL.createObjectURL(file);
    });
  }

  // Inicializar mapa (Leaflet)
  const map = L.map('mapConfig').setView([currentLat, currentLng], 15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
  const marker = L.marker([currentLat, currentLng], { draggable: true }).addTo(map);

  const updateAddressDisplay = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      const addr = data.address || {};

      addressDisplay.innerHTML = '';
      const fields = [
        { label: 'Calle', value: addr.road },
        { label: 'Número', value: addr.house_number },
        { label: 'Barrio', value: addr.suburb },
        { label: 'Municipio', value: addr.city || addr.town || addr.village },
        { label: 'Departamento', value: addr.county },
        { label: 'Provincia', value: addr.state },
        { label: 'Código Postal', value: addr.postcode },
        { label: 'País', value: addr.country }
      ];

      fields.forEach(f => {
        if (f.value) {
          const p = document.createElement('p');
          const labelSpan = document.createElement('span');
          labelSpan.textContent = `${f.label}: `;
          labelSpan.style.color = '#2c7a7b';
          labelSpan.style.fontWeight = 'bold';
          const valueSpan = document.createElement('span');
          valueSpan.textContent = f.value;
          valueSpan.style.color = '#000';
          p.appendChild(labelSpan);
          p.appendChild(valueSpan);
          p.style.margin = '2px 0';
          p.style.fontSize = '14px';
          p.style.textAlign = 'left';
          addressDisplay.appendChild(p);
        }
      });
    } catch (err) {
      addressDisplay.innerHTML = '<p>Dirección no disponible</p>';
    }
  };

  // Llamar la primera vez
  updateAddressDisplay(currentLat, currentLng);

  // GeoSearch (barra de búsqueda)
  const provider = new window.GeoSearch.OpenStreetMapProvider();
  const searchControl = new window.GeoSearch.GeoSearchControl({
    provider: provider,
    style: 'bar',
    showMarker: false,
    autoComplete: true,
    autoCompleteDelay: 250
  });
  map.addControl(searchControl);

  map.on('geosearch/showlocation', async (result) => {
    const { x: lng, y: lat } = result.location;
    currentLat = lat;
    currentLng = lng;
    marker.setLatLng([lat, lng]);
    map.setView([lat, lng], 16);
    await updateAddressDisplay(lat, lng);
  });

  marker.on('dragend', async () => {
    const pos = marker.getLatLng();
    currentLat = pos.lat;
    currentLng = pos.lng;
    await updateAddressDisplay(currentLat, currentLng);
  });

  // Subida/transformación de imagen: por ahora usamos objectURL (no sube a servidor)
  const uploadImage = async (file) => {
    if (!file) return null;
    return URL.createObjectURL(file);
  };

  // Guardar local (para pruebas rápidas sin subir JSON)
  saveLocalBtn.addEventListener('click', async () => {
    try {
      const logoStoreURL = await uploadImage(inputs.logoStore.files ? inputs.logoStore.files[0] : null);
      const logoSearchURL = await uploadImage(inputs.logoSearch.files ? inputs.logoSearch.files[0] : null);

      localStorage.setItem('whatsappNumber', inputs.whatsapp.value.trim());
      localStorage.setItem('phoneNumber', inputs.phone.value.trim());
      localStorage.setItem('instagramLink', inputs.instagram.value.trim());
      localStorage.setItem('facebookLink', inputs.facebook.value.trim());
      localStorage.setItem('emailAddress', inputs.email.value.trim());
      localStorage.setItem('bgColor', inputs.bgColor.value);
      localStorage.setItem('btnColor', inputs.btnColor.value);
      localStorage.setItem('textColor', inputs.textColor.value);
      localStorage.setItem('lat', currentLat);
      localStorage.setItem('lng', currentLng);
      localStorage.setItem('address', addressDisplay.textContent.trim());
      localStorage.setItem('whatsappMessage', inputs.whatsappMessage.value.trim());

      try {
        localStorage.setItem('showWhatsapp', toggles.whatsapp.checked);
        localStorage.setItem('showTelefono', toggles.telefono.checked);
        localStorage.setItem('showInstagram', toggles.instagram.checked);
        localStorage.setItem('showFacebook', toggles.facebook.checked);
        localStorage.setItem('showEmail', toggles.email.checked);
        localStorage.setItem('showMap', toggles.map.checked);
      } catch (e) {
        console.warn('No se pudieron guardar algunos toggles', e);
      }

      if (logoStoreURL) localStorage.setItem('logoStore', logoStoreURL);
      if (logoSearchURL) localStorage.setItem('logoSearch', logoSearchURL);

      localStorage.setItem('configUpdate', Date.now());
      alert('✅ Guardado localmente (localStorage). Ahora abrí index.html en otra pestaña para probar la sincronización.');
    } catch (err) {
      console.error('Error guardando localmente:', err);
      alert('✖ Error al guardar localmente. Revisa la consola.');
    }
  });

  // Descargar JSON (subirás al repo)
  // Descargar JSON (subirás al repo)
saveBtn.addEventListener('click', async () => {
  const getBase64 = file =>
    new Promise(resolve => {
      if (!file) return resolve('');
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });

  const cfg = {
    whatsapp: inputs.whatsapp.value.trim(),
    whatsappMessage: inputs.whatsappMessage.value.trim(),
    phone: inputs.phone.value.trim(),
    instagram: inputs.instagram.value.trim(),
    facebook: inputs.facebook.value.trim(),
    email: inputs.email.value.trim(),
    bgColor: inputs.bgColor.value,
    btnColor: inputs.btnColor.value,
    textColor: inputs.textColor.value,
    logoStore: logoStorePreview.src || await getBase64(inputs.logoStore.files[0] || null),
    logoSearch: logoSearchPreview.src || await getBase64(inputs.logoSearch.files[0] || null),
    showWhatsapp: toggles.whatsapp.checked,
    showTelefono: toggles.telefono.checked,
    showInstagram: toggles.instagram.checked,
    showFacebook: toggles.facebook.checked,
    showEmail: toggles.email.checked,
    showMap: toggles.map.checked,
    lat: currentLat,
    lng: currentLng,
    address: addressDisplay.textContent
  };

  // En celulares: mostrar el JSON en pantalla
  const jsonText = JSON.stringify(cfg, null, 2);
  const newWin = window.open();
  if (newWin) {
    newWin.document.write("<pre>" + jsonText + "</pre>");
    newWin.document.title = "config.json";
  } else {
    alert("Copia este JSON:\n\n" + jsonText);
  }
});

  // Función auxiliar: abrir WhatsApp con mensaje guardado (útil para probar)
  window.openWhatsAppWithDefault = (useNumber = true) => {
    const rawPhone = inputs.whatsapp.value.trim();
    const phone = rawPhone.replace(/^\+/, '').replace(/\D/g, '');
    const text = encodeURIComponent(inputs.whatsappMessage.value.trim() || '');
    let url;
    if (useNumber && phone) {
      url = `https://api.whatsapp.com/send?phone=${phone}&text=${text}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${text}`;
    }
    window.open(url, '_blank');
  };

});