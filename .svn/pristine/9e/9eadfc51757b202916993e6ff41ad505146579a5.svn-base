

package main

import (

"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"github.com/hyperledger/fabric/core/chaincode/shim"

)

type BondIssuanceChainCode struct {

}

func main() {
	
	err := shim.Start(new(BondIssuanceChainCode))
	if err != nil {
		fmt.Println("Error starting BondIssuanceChainCode: %s", err)
	}
}

type Bond struct{
	Name string `json:"name"`
	LeadManager BookRunner `json:"leadmanager"`
	InterestRate string `json:"rate"`
	Maturity string `json:"maturity"`
	BookRunners []BookRunner `json:"bookrunners"`
	PrincipalAmount string `json:"principal"`
	UnitAmount float64 `json:"unitamount"`
	Identifier string `json:"Identifiers"`
	IssueDate string `json:"issueDate"`
	Issuer string `json:issuer`
	Ratings Rating `json:"rating"`
	BondKey string `json:"key"`
}

type BookRunner struct {
	Name string `json:"name"`
	AccountKey []byte `json:"key"`
}

type Rating struct {
	Agency string `json:"agency"`
	Rating string `json:"string"`
}

//Interface methods to interact with the blockchain

func (b *BondIssuanceChainCode) Init(stub shim.ChaincodeStubInterface, function string, args []string) ([]byte, error){
	if function == "init"{
		b.init(stub)
	}
	return nil, nil
}

func (b *BondIssuanceChainCode) Invoke(stub shim.ChaincodeStubInterface, function string, args []string) ([]byte, error){
	if args[0] == "createBond"{
		 byteArray, err := b.createBond(stub, args)
		if err != nil{
			return nil, err
		}
		return byteArray, nil
	}
	if args[0] == "updateBond"{
		byteArray, err := b.updateBond(stub, args)
		if err != nil{
			return nil, err
		}
		return byteArray, nil
	}
	return nil, nil
}

func (b *BondIssuanceChainCode) Query(stub shim.ChaincodeStubInterface, function string, args []string) ([]byte, error){
		
	
	
	if args[0] == "getAllBonds"{
		bonds, err := b.getAllBonds(stub)
			if err != nil{
				jsonResp := "{\"Error\":\"Failed to get state for get all bonds\"}"
        			return nil, errors.New(jsonResp)
			}
			bondBytes ,err := json.Marshal(&bonds)
			if err != nil{
				return nil, errors.New("Failed to marshal into json bonds")
			}
			return bondBytes, nil	
	}
	
if args[0] == "getBond"{
	
	bondBytes, err := b.getBond(stub,args[1])
	if err != nil{
		jsonResp := "{\"Error\":\"Failed to get state for the bond\"}"
        			return nil, errors.New(jsonResp)
	}

		return bondBytes, nil	
	}

	if args[0] == "getList"{
		keyBytes, err := stub.GetState("BondKeys")
		if err != nil{
		jsonResp := "{\"Error\":\"Failed to get state for the bond list\"}"
		return nil, errors.New(jsonResp)
		}
		//keyBytes, err = json.Marshal(&keyBytes)
		return keyBytes, nil
	}
	
	keyBytes, err := stub.GetState(args[0])
	if err != nil{
		jsonResp := "{\"Error\":\"Failed to get state for the provided key\"}"
			return nil, errors.New(jsonResp)
		}
	return keyBytes, nil
}


func (b *BondIssuanceChainCode) init(stub shim.ChaincodeStubInterface)([]byte, error){
	
	var blank []string
	blankBytes, _ := json.Marshal(&blank)
	err := stub.PutState("BondKeys", blankBytes)
	if err != nil{
		return nil, err
	}

	return nil, nil
}

func createBondKey(stub shim.ChaincodeStubInterface, key []byte, issueDate string, maturityDate string) (int, error){

	//just make it sequential for the demo

	bondKeys ,err := stub.GetState("BondKeys")
	if err != nil{
		return 0, err
	}

	return len(bondKeys) + 1, nil
}

func (b *BondIssuanceChainCode) createBond(stub shim.ChaincodeStubInterface, args []string)([]byte, error){
	
	var bond Bond
	//var manager BookRunner

	//unmarshal the json object

	err := json.Unmarshal([]byte(args[1]),&bond)

	if err != nil{
		return nil, err
	}

	//create a key using issue date and maturity date

	bondKeyInt, err := createBondKey(stub, bond.LeadManager.AccountKey, bond.IssueDate, string(bond.Maturity))
	if err != nil {
		return nil, err
	}
	
	bondKey := strconv.Itoa(bondKeyInt)
	
	bond.BondKey = bondKey

	bondBytes, err := json.Marshal(&bond)
	if err != nil {
		return nil, err
	}

	err = stub.PutState(bondKey, bondBytes)
	if err != nil{
		return nil, err
	}
	
	//put the new bond key into bond keys array
	
	bondKeyBytes, err := stub.GetState("BondKeys")
	
	var bondKeys []string
	
	err = json.Unmarshal(bondKeyBytes, &bondKeys)
	
	bondKeys = append(bondKeys, bondKey)
	
	bondKeyBytes, err = json.Marshal(&bondKeys)
	
	err = stub.PutState("BondKeys",bondKeyBytes)

	return []byte(bondKey), nil
}

func (b *BondIssuanceChainCode) updateBond(stub shim.ChaincodeStubInterface, args []string) ([]byte, error){
	
	//For Demo Purposes assume only one rating agency exists

	/*callerRole, err := stub.ReadCertAttribute("role")
	if err != nil{
		return nil, err
	}
	
	caller := string(callerRole[:])
	
	if caller != "Ratings"{
		return nil, errors.New("Only Ratings can set the Rating for this bond issuance")
	}*/



	var bondId string = args[1]
		var bondBytes []byte
		var bond Bond

	bondBytes, err := stub.GetState(bondId)
	if err != nil{
		return nil, err
	}

	err = json.Unmarshal(bondBytes, &bond)
	if err != nil{
		return nil, err
	}
	//update what term of the bond is defined by the second arg

	if args[2] == "ratings" {
	bond.Ratings.Agency = "Ratings"
	bond.Ratings.Rating = args[3]

	} else if args[2] == "identifier" {
		bond.Identifier = args[3]
	}

	bondBytes,err = json.Marshal(&bond)
	
	if err != nil{
		return nil, err
	}
	
	err = stub.PutState(bondId, bondBytes)
	if err != nil{
		return nil, err
	} 

	return nil, nil
}


func (b *BondIssuanceChainCode) getAllBonds(stub shim.ChaincodeStubInterface) ([]Bond, error){
	
	var bonds []Bond

	keyBytes, err := stub.GetState("BondKeys")
	if err != nil{
		return nil, err
	}

	var keys []string 

	err = json.Unmarshal(keyBytes,&keys)
	if err != nil{
		return nil, err
	}


	for _, value := range keys {
		bondBytes, err := stub.GetState(value)
		
		if err != nil{
			return nil, err
		}

		var bond Bond
		err = json.Unmarshal(bondBytes, &bond)
		if err != nil{
			return nil, err
		}
		bonds = append(bonds, bond)
	}

	return bonds, nil
}

func (b *BondIssuanceChainCode) getBond(stub shim.ChaincodeStubInterface, bondId string) ([]byte, error){

	bondBytes, err := stub.GetState(bondId)

	if err != nil{
		return nil, err
	}

	return bondBytes, nil

}
