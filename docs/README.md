# OfficeDepot Punch out Application

## Configuration

- VTEX App Key for Punch out user authentication - Needs to have permission `CanPunchout`

## Available Routes

1. PunchOutSetupRequest persistence handler
  ```bash

  POST https://{storeUrl}/_v/private/punch-out/persist-setup-request?baseAuthenticatedDomain=secure.mytestdomain2.com
  Header 'X-VTEX-API-AppKey: <appKey>'
  Header 'X-VTEX-API-AppToken: <appToken>'

  ```

  <details>
    <summary>Request body</summary>

    ```xml
    <?xml version="1.0"?>
    <ODOrderInfo timeStamp="2025-02-07 14:13:30.528" session="0009278" signature="eRVJG" documentid="1447306ffffff867761aa.879058957@app457.snv.ariba.com" type="test" PostedUserID="8">
      <Header msgType="cXML" msgCode="3">
        <Username>08995313|#|john.doe@acme.com</Username>
        <Password>Vtex2025</Password>
        <MarketsiteUser>08995313-CXML</MarketsiteUser>
        <BillToID>08995313</BillToID>
        <ReportLoc>1094</ReportLoc>
        <FutureAdvDelivery>none</FutureAdvDelivery>
        <InvLoc>5910</InvLoc>
        <URL>https://b2bwmtest/invoke/test/postback?interface=cxml</URL>
        <Cookie>DB6FK0JWSY3F</Cookie>
        <Session>https://b2bcomtest.odpbusiness.com/billboard/billboard.do;jsessionid=0000SHS9H29stKV007dzWgzCra2:17nqijur1</Session>
        <PunchoutType>create</PunchoutType>
        <SessionData>&lt;![CDATA[&lt;PunchoutData&gt;&lt;UOMType&gt;UN&lt;/UOMType&gt;
    &lt;OrigIdentity&gt;08995313-CXML&lt;/OrigIdentity&gt;
    &lt;CatalogCode&gt;U&lt;/CatalogCode&gt;&lt;/PunchoutData&gt;]]&gt;</SessionData>
        <PunchoutData>
          <UOMType>UN</UOMType>
          <OrigIdentity>08995313-CXML</OrigIdentity>
          <CatalogCode>U</CatalogCode>
        </PunchoutData>
        <TradingNetworks>
          <ProcessRule>cXML PunchOutSetupRequest Default</ProcessRule>
          <Service>cXML.punchout:_default</Service>
          <PunchoutType>UserLevel</PunchoutType>
          <ProfileID>57h85400ijglos0o0001mr4d</ProfileID>
          <ProfileName>VTEX Team Test</ProfileName>
          <ProfileStatus>Active</ProfileStatus>
          <TNDocID>57go4400ijgt9m1s00005s2v</TNDocID>
          <DupCheck>false</DupCheck>
          <Flags>
            <SuppShipHeadPayloadID>true</SuppShipHeadPayloadID>
          </Flags>
        </TradingNetworks>
        <MessageHeader>
          <ShipTo type="PreLoadAdhoc">
            <Addr id="155931" seq="00003">
              <Name>155931</Name>
              <PostalAddress validate="false">
                <Address1>1070 HORSHAM RD.</Address1>
                <Address2></Address2>
                <City>NORTH WALES</City>
                <State>PA</State>
                <PostalCode>19454</PostalCode>
                <Country>USA</Country>
              </PostalAddress>
              <Contact id="00000236260962">
                <Name>John Doe</Name>
                <Email type="*HTML">john.doe@acme.com</Email>
                <PhoneNumber>
                  <Number>9999999999</Number>
                </PhoneNumber>
              </Contact>
            </Addr>
          </ShipTo>
          <BillTo>
            <Addr>
              <Name>VTEX TEST</Name>
            </Addr>
          </BillTo>
        </MessageHeader>
      </Header>
      <Request deploymentMode="prod">
        <OrderRequest>
          <OrderRequestHeader orderID="PO_67890" orderDate="2023-10-05T16:00:00Z">
            <Total>
              <Money currency="USD">1500.00</Money>
            </Total>
            <!-- <ShipTo>
              <Address addressID="SHP001">
                <Name>Buyer Company</Name>
                <PostalAddress>
                  <Street>123 Main St</Street>
                  <City>New York</City>
                  <State>NY</State>
                  <PostalCode>10001</PostalCode>
                  <Country isoCountryCode="US">United States</Country>
                </PostalAddress>
              </Address>
            </ShipTo> -->
            <!-- <BillTo>
              <Address addressID="BLT001">
                <Name>Buyer Company HQ</Name>
                <PostalAddress>
                  <Street>456 Corporate Blvd</Street>
                  <City>Chicago</City>
                  <State>IL</State>
                  <PostalCode>60601</PostalCode>
                  <Country isoCountryCode="US">United States</Country>
                </PostalAddress>
              </Address>
            </BillTo> -->
          </OrderRequestHeader>
          <!-- ItemIn represents line items in a buyer's purchase order -->
          <ItemIn quantity="10" lineNumber="1">
            <ItemID>
              <BuyerPartID>ITEM_001_BUYER_SKU</BuyerPartID>
              <SupplierPartID>ITEM_001_SUPPLIER_SKU</SupplierPartID>
            </ItemID>
            <ItemDetail>
              <UnitPrice>
                <Money currency="USD">100.00</Money>
              </UnitPrice>
              <Description xml:lang="en">Widget XYZ</Description>
              <UnitOfMeasure>EA</UnitOfMeasure>
              <LeadTime>5</LeadTime>
            </ItemDetail>
          </ItemIn>
          <ItemIn quantity="5" lineNumber="2">
            <ItemID>
              <BuyerPartID>ITEM_002_BUYER_SKU</BuyerPartID>
              <SupplierPartID>ITEM_002_SUPPLIER_SKU</SupplierPartID>
            </ItemID>
            <ItemDetail>
              <UnitPrice>
                <Money currency="USD">100.00</Money>
              </UnitPrice>
              <Description xml:lang="en">Widget ABC</Description>
              <UnitOfMeasure>EA</UnitOfMeasure>
            </ItemDetail>
          </ItemIn>
        </OrderRequest>
      </Request>
      <Security>
        <View name="ACCOUNT_CENTER_SIDEBAR">false</View>
        <View name="ADDITIONAL_DESKTOP_INFO">false</View>
        <View name="BULLETIN_BOARD">true</View>
        <View name="CART">true</View>
        <View name="CHAT">false</View>
        <View name="CHECKOUT_BUTTONS">true</View>
        <View name="COMMONWEALTH_OF_VIRGINIA">false</View>
        <View name="COMPANY">false</View>
        <View name="COSTCENTER_SPLIT_VISIBLE">false</View>
        <View name="CS">false</View>
        <View name="CS_CONTACT_INFORMATION">false</View>
        <View name="CS_PHONE_SUPPORT">false</View>
        <View name="CUSTOMSTAMPS">false</View>
        <View name="ECSUPPORT">true</View>
        <View name="FIND_A_STORE">false</View>
        <View name="FIND_PRINTERS_SUPLLIES_SIDEBAR">true</View>
        <View name="FUTURE_ORDERS_SIDEBAR">false</View>
        <View name="HELP">false</View>
        <View name="HOME_PAGE">true</View>
        <View name="LOGOUT_BUTTON">true</View>
        <View name="LOGOUT_CART">true</View>
        <View name="LINE_ITEM_COMMENTS">false</View>
        <View name="MYCOMPARISON">false</View>
        <View name="MYPROFILE_LITE">false</View>
        <View name="MYPROFILE_SIDEBAR">false</View>
        <View name="MYSHOPPINGLIST_LITE">false</View>
        <View name="MYSHOPPINGLIST_SIDEBAR">true</View>
        <View name="ORDER_APPROVALS">false</View>
        <View name="ORDERHISTORY_LITE">true</View>
        <View name="ORDERHISTORY_SIDEBAR">true</View>
        <View name="SAVE_FOR_LATER">true</View>
        <View name="SEARCH_BY_BRAND">true</View>
        <View name="SHOW_USERINFO_LINK">true</View>
        <View name="SHOW_PAYMENTINFO_LINK">true</View>
        <View name="SITE_INFO">true</View>
        <View name="SITE_INFO_PRIVACY_POLICY">true</View>
        <View name="SITE_INFO_TERMS_OF_USE">true</View>
        <View name="SUPER_GROUP_ONE">true</View>
        <View name="SUPER_GROUP_TWO">true</View>
        <View name="SUPER_GROUP_THREE">true</View>
        <View name="USAGE_REPORTS_SIDEBAR">false</View>
        <View name="USE_LEGACY_SITE">false</View>
        <View name="USERPROFILE_SIDEBAR">false</View>
        <View name="WELCOME_MESSAGE">true</View>
        <View name="SHOW_ONLINE_CATALOGS">true</View>
        <View name="SELECT_SHIPTO">false</View>
        <View name="SHOW_SHARED_CART">false</View>
        <View name="SELECT_ZIPCODE">false</View>
        <View name="CUSTOMER_TOOLS">true</View>
        <View name="MOBILE_APPS">false</View>
        <View name="FOOTER_SHOPPING">false</View>
        <View name="FOOTER_COMPANY_INFO_CORPORATE_SUSTAINABILITY">false</View>
        <View name="BR_SEARCH">true</View>
        <View name="SHOW_CREATE_RETURN">true</View>
        <View name="CDAP SetuserLevel">session: 0008014 - signature: eRVJF</View>
        <Flags>
          <CostCtrFlg>N</CostCtrFlg>
          <PONoFlg>R</PONoFlg>
          <ReleaseFlg>N</ReleaseFlg>
          <DeskTopFlg>N</DeskTopFlg>
          <CRIFlg>H</CRIFlg>
          <MinAdhereFlg>0</MinAdhereFlg>
        </Flags>
        <UserProfile username="john.doe@acme.com">
          <Flag name="CustomCatalogID">0</Flag>
          <Flag name="OEFlag">1</Flag>
          <Flag name="QyFlag">0</Flag>
          <Flag name="RptFlag">1</Flag>
          <Flag name="BOFlag">1</Flag>
          <Flag name="ABFlag">1</Flag>
          <Flag name="MDFlag">S</Flag>
          <Flag name="CCMFlg">S</Flag>
          <Flag name="RelMFlg">S</Flag>
          <Flag name="POMFlg">S</Flag>
          <Flag name="STMFlg">S</Flag>
          <Flag name="TTMFlg">1</Flag>
          <Flag name="CrCMFlg">1</Flag>
          <Flag name="PrBkFlg">1</Flag>
          <Flag name="RestricFlg"> </Flag>
          <Flag name="ExtPrcDolLmt">0.00</Flag>
          <Flag name="OrdTotDolLmt">0.00</Flag>
          <Flag name="UniPrcDolLmt">0.00</Flag>
          <Flag name="TdrDft">AB</Flag>
          <Flag name="ZipDft">334962434  </Flag>
        </UserProfile>
      </Security>
      <TransportInfo>
        <requestURL>/invoke/xml.process/submitXmlFromLogs</requestURL>
        <localPort>6443</localPort>
        <remoteIP>10.120.96.141</remoteIP>
      </TransportInfo>
      <OriginalDoc></OriginalDoc>
    </ODOrderInfo>
    ```

    </details>

## Testing

`@vtex/test-tools` and `@types/jest` should be installed on `./node` package as `devDependencies`.

Run `vtex test` and [Jest](https://jestjs.io/) will do its thing.

Check the `node/__tests__/simple.test.ts` test case and also [Jest's Documentation](https://jestjs.io/docs/en/getting-started).
