<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.11.2" name="prototype" tilewidth="16" tileheight="16" tilecount="110" columns="11">
 <grid orientation="orthogonal" width="176" height="160"/>
 <image source="prototype-tileset.png" width="176" height="160"/>
 <tile id="0">
  <properties>
   <property name="type" value="exit"/>
  </properties>
 </tile>
 <tile id="12">
  <properties>
   <property name="type" value="hazard"/>
  </properties>
 </tile>
 <tile id="20">
  <properties>
   <property name="collectableType" value="power"/>
   <property name="type" value="collectable"/>
  </properties>
 </tile>
 <tile id="22">
  <properties>
   <property name="solid" type="bool" value="true"/>
  </properties>
 </tile>
 <tile id="23">
  <properties>
   <property name="type" value="enemy"/>
  </properties>
 </tile>
 <tile id="41">
  <properties>
   <property name="collectableType" value="health"/>
   <property name="type" value="collectable"/>
  </properties>
 </tile>
 <tile id="53">
  <properties>
   <property name="collectableType" value="health"/>
   <property name="type" value="collectable"/>
   <property name="value" type="int" value="25"/>
  </properties>
 </tile>
 <tile id="68">
  <properties>
   <property name="type" value="playerSpawn"/>
  </properties>
 </tile>
 <tile id="78">
  <properties>
   <property name="type" value="enemySpawn"/>
  </properties>
 </tile>
</tileset>
