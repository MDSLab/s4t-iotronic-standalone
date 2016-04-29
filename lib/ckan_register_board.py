import json
import httplib2
import uuid
import sys

from datetime import datetime

ckan_token = '22c5cfa7-9dea-4dd9-9f9d-eedf296852ae'
organization = "TEST" 
ckan_addr = 'smartme-data.unime.it';

url_datastore_create = "http://"+ckan_addr+"/api/3/action/datastore_create"
url_upsert = "http://"+ckan_addr+"/api/3/action/datastore_upsert"
url_dataset="http://smartme-data.unime.it/api/rest/dataset"

metrics = ["temperature", "humidity"]





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
    
    return json.loads(content)



if __name__ == "__main__":


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
    dictionary= {"name":board_uuid, "title":board_uuid, "owner_org":organization, "extras":{"Label":Label,"Manufacturer":Manufacturer, "Model":Model,"Altitude":Altitude,"Latitude":Latitude,"Longitude":Longitude}}
    result = rest_call_post(url_dataset, dictionary)
    #print "\nSTEP 1: \n" + str(result)
    print "\nSTEP 1 - Dataset created: " + str(result["name"])


    #STEP 2 creazione datastore sensors
    dictionary= {"resource": {"package_id":board_uuid, "name":"sensors"}, "primary_key":["Type", "Model"], "fields": [ {"id": "Type", "type":"text"}, {"id": "Model", "type":"text"}, {"id": "Unit", "type":"text"}, {"id": "FabricName", "type":"text"}, {"id": "ResourceID", "type":"text"}, {"id": "Date", "type":"timestamp"}] }
    result = rest_call_post(url_datastore_create, dictionary)
    #print "\nSTEP 3:\n" + str(result)
    sensors_result = result["result"]
    sensors_id= sensors_result.get("resource_id")
    #print "Sensors UUID: " + str(sensors_id)
    print "\nSTEP 2 - Sensors datastore UUID: " + str(sensors_id)


    #STEP 4 creazione datastore delle metriche
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
	

      elif metric == "humidity":
	
	m_dictionary = {"resource": {"package_id":board_uuid, "name":"humidity"}, "fields": [ {"id": "Date", "type":"timestamp"}, {"id": "Humidity", "type":"numeric"}, {"id": "Altitude", "type":"numeric"}, {"id": "Latitude", "type":"numeric"}, {"id": "Longitude", "type":"numeric"}] }
	m_result = rest_call_post(url_datastore_create, m_dictionary)
	datastore_result = m_result["result"]
	datastore_id= datastore_result.get("resource_id")
	print "Humidity datastore UUID: " + str(datastore_id)
	dictionary = {"resource_id":sensors_id, "method":"insert", "records":[{"Type":"humidity","Model":"HIH-4030","Unit":"percent","FabricName":"Honeywell","ResourceID":datastore_id,"Date":timestamp}]}
	rest_call_post(url_upsert, dictionary)


    