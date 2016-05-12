import json
import httplib2
import uuid
import sys

from datetime import datetime

ckan_token = ''
organization = '' 
ckan_addr = ''

url_datastore_create = "http://"+ckan_addr+"/api/3/action/datastore_create"
url_upsert = "http://"+ckan_addr+"/api/3/action/datastore_upsert"
url_dataset="http://"+ckan_addr+"/api/rest/dataset"

metrics = ["temperature", "brightness", "humidity", "pressure", "gas", "noise"]





def rest_call_get(url):
    http = httplib2.Http()
    response, send=http.request(url,"GET")
    result=json.dumps(response, sort_keys=True, indent=4, separators=(',', ': '))
    return send
  
def rest_call_post(url, dictionary):  
    http = httplib2.Http()
    resp, content = http.request(
        uri=url,
        method='POST',
        headers={'Content-Type': 'application/json; charset=UTF-8', 'Authorization': ckan_token},
        body=json.dumps(dictionary),
    )
    #print resp
    #print content
    
    return json.loads(content)
  




if __name__ == "__main__":


    #print 'Number of arguments:', len(sys.argv), 'arguments.'
    #['ckan_register_board.py', board, board_label, altitude, latitude, longitude ]
    print 'Argument List:', str(sys.argv)
    
    
    
    board_uuid = str(sys.argv[1]) 
    #board_uuid = str(uuid.uuid4())
    print 'Board UUID:', board_uuid
    
    Label = str(sys.argv[2]) 
    print 'Label:', Label
    
    Altitude =	sys.argv[3] 
    print 'Altitude:', str(Altitude)
    
    Latitude =	sys.argv[4] 
    print 'Latitude:', str(Latitude)
    
    Longitude =	sys.argv[5] 
    print 'Longitude:', str(Longitude)
    
    Manufacturer = "Arduino" #str(sys.argv[5]) 
    print 'Manufacturer:', Manufacturer
    
    Model = "Yun" #str(sys.argv[6]) 
    print 'Model:', Model

    print 'Organization:', organization
    
    
    timestamp = datetime.now().strftime('%Y-%m-%dT%H:%M:%S.%f')

    #STEP 1 - creazione dataset
    #curl http://<CKAN-ADDR>/api/rest/dataset -d '{"name":"00000000", "title":"00000000"}' -H "Authorization:<API-KEY>"  
    dictionary= {"name":board_uuid, "title":board_uuid, "owner_org":organization, "extras":{"Label":Label,"Manufacturer":Manufacturer, "Model":Model,"Altitude":Altitude,"Latitude":Latitude,"Longitude":Longitude}}
    result = rest_call_post(url_dataset, dictionary)
    #print "\nSTEP 1: \n" + str(result)
    print "\nSTEP 1 - Dataset created: " + str(result["name"])


    """
    #STEP 1.1 creazione datastore metadata
    #curl -H 'Authorization: <API-KEY>' 'http://<CKAN-ADDR>/api/3/action/datastore_create' -d '{"resource": {"package_id":"00000000", "name":"metadata"}, "fields": [ {"id": "Manufacturer", "type":"text"}, {"id": "Model", "type":"text"}, {"id": "Altitude", "type":"numeric"}, {"id": "Latitude", "type":"numeric"}, {"id": "Longitude", "type":"numeric"}] }'
    dictionary= {"resource": {"package_id":board_uuid, "name":"metadata"}, "fields": [ {"id": "Label", "type":"text"}, {"id": "Manufacturer", "type":"text"}, {"id": "Model", "type":"text"}, {"id": "Altitude", "type":"numeric"}, {"id": "Latitude", "type":"numeric"}, {"id": "Longitude", "type":"numeric"}] }
    result = rest_call_post(url_datastore_create, dictionary)
    #print "\nSTEP 1.1:\n" + str(result)
    matadata_result = result["result"]
    matadata_id= matadata_result.get("resource_id")
    #print "Metadata UUID: " + str(matadata_id)
    print "\nSTEP 1.1 - Metadata UUID:\n" + str(matadata_id)

    #STEP 1.2 inserimento dati in metadata
    #curl -H 'Authorization: <API-KEY>' 'http://<CKAN-ADDR>/api/3/action/datastore_upsert' -d '{"resource_id":"5730a2fd-f832-42f6-9795-ecee3f7b8ee1", "method":"insert", "records":[{"Manufacturer":"Arduino","Model":"Yun","Altitude":19,"Latitude":38.19642,"Longitude":15.56287 }]}'
    dictionary = {"resource_id":matadata_id, "method":"insert", "records":[{"Label":"@ing","Manufacturer":"Arduino","Model":"Yun","Altitude":19,"Latitude":38.19642,"Longitude":15.56287 }]}
    rest_call_post(url_upsert, dictionary)
    """

    #STEP 2 creazione datastore sensors
    #curl -H 'Authorization: <API-KEY>' 'http://<CKAN-ADDR>/api/3/action/datastore_create' -d '{"resource": {"package_id":"00000000", "name":"sensors"}, "fields": [ {"id": "Type", "type":"text"}, {"id": "Model", "type":"text"}, {"id": "Unit", "type":"text"}, {"id": "FabricName", "type":"text"}, {"id": "ResourceID", "type":"text"}, {"id": "Date", "type":"timestamp"}] }'
    dictionary= {"resource": {"package_id":board_uuid, "name":"sensors"}, "primary_key":["Type", "Model"], "fields": [ {"id": "Type", "type":"text"}, {"id": "Model", "type":"text"}, {"id": "Unit", "type":"text"}, {"id": "FabricName", "type":"text"}, {"id": "ResourceID", "type":"text"}, {"id": "Date", "type":"timestamp"}] }
    result = rest_call_post(url_datastore_create, dictionary)
    #print "\nSTEP 3:\n" + str(result)
    sensors_result = result["result"]
    sensors_id= sensors_result.get("resource_id")
    #print "Sensors UUID: " + str(sensors_id)
    print "\nSTEP 2 - Sensors datastore UUID: " + str(sensors_id)


    #STEP 4 creazione datastore delle metriche
    #curl -H 'Authorization: <API-KEY>' 'http://<CKAN-ADDR>/api/3/action/datastore_create' -d '{"resource": {"package_id":"00000000", "name":"temperature"}, "fields": [ {"id": "Date", "type":"timestamp"}, {"id": "Temperature", "type":"numeric"}, {"id": "Altitude", "type":"numeric"}, {"id": "Latitude", "type":"numeric"}, {"id": "Longitude", "type":"numeric"}] }'
    print "\nSTEP 3 - Metrics datastores creation...\n"
    for metric in metrics:
      
      if metric == "temperature":
	
	m_dictionary = {"resource": {"package_id":board_uuid, "name":"temperature"}, "fields": [ {"id": "Date", "type":"timestamp"}, {"id": "Temperature", "type":"numeric"}, {"id": "Altitude", "type":"numeric"}, {"id": "Latitude", "type":"numeric"}, {"id": "Longitude", "type":"numeric"}] }
	m_result = rest_call_post(url_datastore_create, m_dictionary)
	datastore_result = m_result["result"]
	datastore_id= datastore_result.get("resource_id")
	print "Temperature datastore UUID: " + str(datastore_id)
	dictionary = {"resource_id":sensors_id, "method":"insert", "records":[{"Type":"temperature","Model":"Thermistor","Unit":"C","FabricName":"TinkerKit","ResourceID":datastore_id,"Date":timestamp}]}
	rest_call_post(url_upsert, dictionary)
	
	
      elif metric == "brightness":
	
	m_dictionary = {"resource": {"package_id":board_uuid, "name":"brightness"}, "fields": [ {"id": "Date", "type":"timestamp"}, {"id": "Brightness", "type":"numeric"}, {"id": "Altitude", "type":"numeric"}, {"id": "Latitude", "type":"numeric"}, {"id": "Longitude", "type":"numeric"}] }
	m_result = rest_call_post(url_datastore_create, m_dictionary)
	datastore_result = m_result["result"]
	datastore_id= datastore_result.get("resource_id")
	print "Brightness datastore UUID: " + str(datastore_id)
	dictionary = {"resource_id":sensors_id, "method":"insert", "records":[{"Type":"brightness","Model":"LDR","Unit":"lux","FabricName":"TinkerKit","ResourceID":datastore_id,"Date":timestamp}]}
	rest_call_post(url_upsert, dictionary)
	

      elif metric == "humidity":
	
	m_dictionary = {"resource": {"package_id":board_uuid, "name":"humidity"}, "fields": [ {"id": "Date", "type":"timestamp"}, {"id": "Humidity", "type":"numeric"}, {"id": "Altitude", "type":"numeric"}, {"id": "Latitude", "type":"numeric"}, {"id": "Longitude", "type":"numeric"}] }
	m_result = rest_call_post(url_datastore_create, m_dictionary)
	datastore_result = m_result["result"]
	datastore_id= datastore_result.get("resource_id")
	print "Humidity datastore UUID: " + str(datastore_id)
	dictionary = {"resource_id":sensors_id, "method":"insert", "records":[{"Type":"humidity","Model":"HIH-4030","Unit":"percent","FabricName":"Honeywell","ResourceID":datastore_id,"Date":timestamp}]}
	rest_call_post(url_upsert, dictionary)
	
      elif metric == "pressure":
	
	m_dictionary = {"resource": {"package_id":board_uuid, "name":"pressure"}, "fields": [ {"id": "Date", "type":"timestamp"}, {"id": "Pressure", "type":"numeric"}, {"id": "Altitude", "type":"numeric"}, {"id": "Latitude", "type":"numeric"}, {"id": "Longitude", "type":"numeric"}] }
	m_result = rest_call_post(url_datastore_create, m_dictionary)
	datastore_result = m_result["result"]
	datastore_id= datastore_result.get("resource_id")
	print "Pressure datastore UUID: " + str(datastore_id)
	dictionary = {"resource_id":sensors_id, "method":"insert", "records":[{"Type":"barometer","Model":"mpl3115","Unit":"hPa","FabricName":"TinkerKit","ResourceID":datastore_id,"Date":timestamp}]}
	rest_call_post(url_upsert, dictionary)    
	
      elif metric == "gas":
	
	m_dictionary = {"resource": {"package_id":board_uuid, "name":"gas"}, "fields": [ {"id": "Date", "type":"timestamp"}, {"id": "Gas", "type":"numeric"}, {"id": "Altitude", "type":"numeric"}, {"id": "Latitude", "type":"numeric"}, {"id": "Longitude", "type":"numeric"}] }
	m_result = rest_call_post(url_datastore_create, m_dictionary)
	datastore_result = m_result["result"]
	datastore_id= datastore_result.get("resource_id")
	print "Gas datastore UUID: " + str(datastore_id)
	dictionary = {"resource_id":sensors_id, "method":"insert", "records":[{"Type":"gas","Model":"MQ9","Unit":"ppm","FabricName":"Grove","ResourceID":datastore_id,"Date":timestamp}]}
	rest_call_post(url_upsert, dictionary)    
	
      elif metric == "noise":
	
	m_dictionary = {"resource": {"package_id":board_uuid, "name":"noise"}, "fields": [ {"id": "Date", "type":"timestamp"}, {"id": "Noise", "type":"numeric"}, {"id": "Altitude", "type":"numeric"}, {"id": "Latitude", "type":"numeric"}, {"id": "Longitude", "type":"numeric"}] }
	m_result = rest_call_post(url_datastore_create, m_dictionary)
	datastore_result = m_result["result"]
	datastore_id= datastore_result.get("resource_id")
	print "Noise datastore UUID: " + str(datastore_id)
	dictionary = {"resource_id":sensors_id, "method":"insert", "records":[{"Type":"sound_detect","Model":"HY-038","Unit":"amplitude","FabricName":"Keyes","ResourceID":datastore_id,"Date":timestamp}]}
	rest_call_post(url_upsert, dictionary)    
    