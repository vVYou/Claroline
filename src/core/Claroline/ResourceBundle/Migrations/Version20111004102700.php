<?php

namespace Claroline\ResourceBundle\Migrations;

use Claroline\InstallBundle\Library\Migration\BundleMigration;
use Doctrine\DBAL\Schema\Schema;

class Version20111004102700 extends BundleMigration
{
    public function up(Schema $schema)
    {
        $this->createResourceTable($schema);
    }
    
    private function createResourceTable(Schema $schema)
    {
        $table = $schema->createTable('claro_resource');
        
        $this->addId($table);
        $this->addDiscriminator($table);
        $table->addColumn('created', 'datetime');
        $table->addColumn('updated', 'datetime');
    }
    
    public function down(Schema $schema)
    {
        $schema->dropTable('claro_resource');
    }
}