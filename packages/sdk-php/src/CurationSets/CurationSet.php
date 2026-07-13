<?php
declare(strict_types=1);
namespace AACSearch\SDK\CurationSets;
use AACSearch\SDK\ApiCall;
class CurationSet { public readonly CurationSetItems $items; private array $im=[]; public function __construct(private readonly string $c,private readonly string $id,private readonly ApiCall $a){$this->items=new CurationSetItems($c,$id,$a);} public function items(?string $iid=null):CurationSetItems|CurationSetItem{if($iid===null)return $this->items;if(!isset($this->im[$iid]))$this->im[$iid]=new CurationSetItem($this->c,$this->id,$iid,$this->a);return $this->im[$iid];} public function retrieve():array{return $this->a->get('/curations/'.urlencode($this->c).'/curations/'.urlencode($this->id));} public function delete():array{return $this->a->delete('/curations/'.urlencode($this->c).'/curations/'.urlencode($this->id));} }
