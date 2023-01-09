<?php  
// $arg = array(
// 	'taxonomy' => 'portcats',
//     'hide_empty' => true,
//     'parent' => 0
// );
// $categories = get_categories($arg);


$home_page_id = 521;
$categories = get_field('featured_categories',$home_page_id);
if($categories) { ?>
<div class="portfolio-categories-list clear">
	<div class="flexrow clear">
	<?php foreach ($categories as $cat) { 
		// echo '<pre>';
		// print_r($cat);
		// echo '</pre>';
		$cat_name = $cat->name;
		$cat_slug = $cat->slug;
		// $url =  get_bloginfo('url').'/portfolio/?_project_type='.$cat_slug;
		$url = get_bloginfo('url') . '/portfolio-categories/' . $cat_slug;
		$catImg = get_field('category_featured_image_to_show_on_homepage', $cat->taxonomy.'_'.$cat->term_id);
		if(!$catImg){
			$catImg = get_field('category_featured_image', $cat->taxonomy.'_'.$cat->term_id);
		}
		$catLink = get_term_link($cat);
		if($catImg) {
			$catImgSrc = $catImg['sizes']['large'];
			$cat_alt = $catImg['title'];
		} else {
			$catImgSrc = get_bloginfo('template_url').'/images/noimage.gif';
			$cat_alt = '';
		}
		//echo $cat->term_id;
		?>
		<div class="portcat flexcol">
			<div class="inside clear">
				<a href="<?php echo $url; ?>" style="background-image:url('<?php echo $catImgSrc;?>');">
					<img class="transparent" src="<?php echo get_bloginfo('template_url') ?>/images/transparent.png" alt="" aria-hidden="true" />
					<img class="actual" src="<?php echo $catImgSrc ?>" alt="<?php echo $cat_alt ?>" />
					<span class="catname"><span><?php echo $cat_name; ?></span></span>
				</a>
			</div>
		</div>	
	<?php } ?>
		<div class="portcat flexcol sitelogo">
			<div class="inside clear transitional">
				<a href="https://www.jenkinspeer.com/firm/">
					<span class="imagebg" style="background-image:url('<?php echo get_bloginfo('template_url');?>/images/JPA-initials.jpg');"></span>
					<img src="<?php echo get_bloginfo('template_url');?>/images/JPA-initials.jpg" alt="<?php echo get_bloginfo('name'); ?>" />
				</a><!-- new logo -->
			</div>
		</div>	
	</div>
</div>
<?php } ?>

