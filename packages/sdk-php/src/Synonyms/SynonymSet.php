<?php
declare(strict_types=1);
namespace AACSearch\SDK\Synonyms;
use AACSearch\SDK\ApiCall;
class SynonymSet { public readonly SynonymSetItems $items; private array $im=[]; public function __construct(private readonly string $id,private readonly ApiCall $a){$this->items=new SynonymSetItems($id,$a);} public function items(?string $iid=null):SynonymSetItems|SynonymSetItem{if($iid===null)return $this->items;if(!isset($this->im[$iid]))$this->im[$iid]=new SynonymSetItem($this->id,$iid,$this->a);return $this->im[$iid];} public function retrieve():array{return $this->a->get('/synonyms/'.urlencode($this->id));} public function delete():array{return $this->a->delete('/synonyms/'.urlencode($this->id));} }
