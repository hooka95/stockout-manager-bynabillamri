const { useState } = React;
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } = Recharts;

function StockManagementApp() {
  // États
  const [inventory, setInventory] = useState([]);
  const [remaining, setRemaining] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [receptions, setReceptions] = useState({});
  const [productions, setProductions] = useState({});
  const [expeditions, setExpeditions] = useState({});
  const [selectedItemGraph, setSelectedItemGraph] = useState(null);
  const [alertFilter, setAlertFilter] = useState('all');

  // Fonctions de calcul
  const calculateTotalQuantity = (row) => {
    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G1', 'G2', 'H1', 'J1', 'J2', 'K', 'PROD', 'N', 'O2', 'O3', 'Repack', '24A', '24B'];
    let total = 0;
    for (const col of columns) {
      let value = row[col];
      if (typeof value === 'string' && value.includes('/')) {
        value = value.split('/')[0];
      }
      total += parseInt(value) || 0;
    }
    return total;
  };

  const getStockStatus = (disponibilite) => {
    if (disponibilite < 0) return { text: 'STOCKOUT', color: 'bg-red-600 text-white' };
    if (disponibilite < 50) return { text: 'CRITIQUE', color: 'bg-red-100 text-red-800' };
    if (disponibilite < 100) return { text: 'STOCK BAS', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'À NIVEAU', color: 'bg-green-100 text-green-800' };
  };

  // Gestion des fichiers
  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      if (type === 'inventory') {
        const processedData = jsonData.map(row => ({
          itemNo: row['Item No'],
          itemDesc: row['Item Desc'],
          quantity: calculateTotalQuantity(row)
        }));
        setInventory(processedData);
      } else if (type === 'remaining') {
        const processedData = jsonData.map(row => ({
          itemNo: row['Item No'],
          itemDesc: row['Item Desc'],
          remaining: parseInt(row['Remaining']) || 0,
          picked: parseInt(row['Picked']) || 0
        }));
        setRemaining(processedData);
      }
      setDataLoaded(true);
    };
    reader.readAsArrayBuffer(file);
  };

  // Gestion des inputs
  const handleInputChange = (itemNo, type, value) => {
    const numValue = parseInt(value) || 0;
    switch(type) {
      case 'reception':
        setReceptions(prev => ({ ...prev, [itemNo]: numValue }));
        break;
      case 'production':
        setProductions(prev => ({ ...prev, [itemNo]: numValue }));
        break;
      case 'expedition':
        setExpeditions(prev => ({ ...prev, [itemNo]: numValue }));
        break;
    }
  };

  // Rendu de l'interface
  return React.createElement('div', { className: 'min-h-screen bg-gray-100 p-6' },
    React.createElement('div', { className: 'max-w-7xl mx-auto' }, [
      // Header
      React.createElement('h1', { className: 'text-3xl font-bold text-gray-900 mb-8' }, 'Stockout Manager'),

      // Filtres
      dataLoaded && React.createElement('div', { className: 'flex space-x-2 mb-6' }, 
        ['all', 'stockout', 'critique', 'bas'].map(filter => 
          React.createElement('button', {
            key: filter,
            onClick: () => setAlertFilter(filter),
            className: `px-3 py-1 rounded ${alertFilter === filter ? 'bg-blue-600 text-white' : 'bg-gray-200'}`
          }, filter === 'all' ? 'Tous' : filter.charAt(0).toUpperCase() + filter.slice(1))
        )
      ),

      // Section import
      React.createElement('div', { className: 'bg-white p-6 rounded-lg shadow mb-6' }, [
        React.createElement('h2', { className: 'text-xl font-semibold mb-4' }, 'Import des données'),
        React.createElement('div', { className: 'grid grid-cols-2 gap-4' }, [
          React.createElement('div', { key: 'inventory' }, [
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Inventaire (XLSX)'),
            React.createElement('input', {
              type: 'file',
              accept: '.xlsx',
              onChange: (e) => handleFileUpload(e, 'inventory'),
              className: 'block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700'
            })
          ]),
          React.createElement('div', { key: 'remaining' }, [
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Remaining (XLSX)'),
            React.createElement('input', {
              type: 'file',
              accept: '.xlsx',
              onChange: (e) => handleFileUpload(e, 'remaining'),
              className: 'block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700'
            })
          ])
        ])
      ]),

      // Tableau des données
      dataLoaded && React.createElement('div', { className: 'bg-white rounded-lg shadow' }, [
        React.createElement('table', { className: 'min-w-full divide-y divide-gray-200' }, [
          React.createElement('thead', { className: 'bg-gray-50' }, 
            React.createElement('tr', {}, [
              'Item No',
              'Description',
              'Inventaire',
              'Picked',
              'Remaining',
              'Réception',
              'Production',
              'Expédition',
              'Balance',
              'Disponibilité',
              'Status',
              'Actions'
            ].map(header => 
              React.createElement('th', { 
                key: header,
                className: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'
              }, header)
            ))
          ),
          React.createElement('tbody', { className: 'bg-white divide-y divide-gray-200' },
            inventory.map(item => {
              const remainingData = remaining.find(r => r.itemNo === item.itemNo);
              const reception = receptions[item.itemNo] || 0;
              const production = productions[item.itemNo] || 0;
              const expedition = expeditions[item.itemNo] || 0;
              
              const balance = item.quantity - (remainingData?.picked || 0) + reception + production - expedition;
              const disponibilite = balance - (remainingData?.remaining || 0);
              const status = getStockStatus(disponibilite);

              return [
                React.createElement('tr', { key: item.itemNo }, [
                  React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' }, item.itemNo),
                  React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' }, item.itemDesc),
                  React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' }, item.quantity),
                  React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' }, remainingData?.picked || 0),
                  React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' }, remainingData?.remaining || 0),
                  React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' },
                    React.createElement('input', {
                      type: 'number',
                      value: reception,
                      onChange: (e) => handleInputChange(item.itemNo, 'reception', e.target.value),
                      className: 'w-20 px-2 py-1 border rounded'
                    })
                  ),
                  React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' },
                    React.createElement('input', {
                      type: 'number',
                      value: production,
                      onChange: (e) => handleInputChange(item.itemNo, 'production', e.target.value),
                      className: 'w-20 px-2 py-1 border rounded'
                    })
                  ),
                  React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' },
                    React.createElement('input', {
                      type: 'number',
                      value: expedition,
                      onChange: (e) => handleInputChange(item.itemNo, 'expedition', e.target.value),
                      className: 'w-20 px-2 py-1 border rounded'
                    })
                  ),
                  React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' }, balance),
                  React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' }, disponibilite),
                  React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' },
                    React.createElement('span', { 
                      className: `px-2 py-1 rounded-full text-xs font-semibold ${status.color}`
                    }, status.text)
                  ),
                  React.createElement('td', { className: 'px-6 py-4 whitespace-nowrap' },
                    React.createElement('button', {
                      onClick: () => setSelectedItemGraph(selectedItemGraph === item.itemNo ? null : item.itemNo),
                      className: 'text-blue-600 hover:text-blue-900'
                    }, selectedItemGraph === item.itemNo ? 'Masquer' : 'Voir graphique')
                  )
                ]),
                selectedItemGraph === item.itemNo && React.createElement('tr', { key: `graph-${item.itemNo}` },
                  React.createElement('td', { colSpan: 12, className: 'px-6 py-4' },
                    React.createElement(LineChart, { width: 1000, height: 300, data: [
                      { name: 'Inventaire', value: item.quantity },
                      { name: 'Picked', value: remainingData?.picked || 0 },
                      { name: 'Remaining', value: remainingData?.remaining || 0 },
                      { name: 'Réception', value: reception },
                      { name: 'Production', value: production },
                      { name: 'Expédition', value: expedition },
                      { name: 'Balance', value: balance },
                      { name: 'Disponibilité', value: disponibilite }
                    ] }, [
                      React.createElement(CartesianGrid, { strokeDasharray: '3 3' }),
                      React.createElement(XAxis, { dataKey: 'name' }),
                      React.createElement(YAxis),
                      React.createElement(Tooltip),
                      React.createElement(Legend),
                      React.createElement(Line, { 
                        type: 'monotone', 
                        dataKey: 'value', 
                        stroke: '#2563eb',
                        name: 'Valeur'
                      })
                    ])
                  )
                )
              ];
            }).flat()
          )
        ])
      ])
    ])
  );
}

// Rendu de l'application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(StockManagementApp));