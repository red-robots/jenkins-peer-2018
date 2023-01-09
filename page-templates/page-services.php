<?php
/**
 * Template Name: Services
 */

get_header(); ?>

<?php get_sidebar('services'); ?>

	<div id="primary" class="site-content">
		<div id="content" role="main">

			
				
            <?php if(have_posts()) : while(have_posts()) : the_post(); ?>    
            <h2 class="page-title" style="position:absolute;top:-100vh;z-index:-999;"><?php the_title() ?></h2>
            <?php endwhile; endif; wp_reset_postdata(); ?>
                
               
               <div class="left-cont-pad">
                <div class="entry-content">
                
<?php
    $wp_query = new WP_Query();
    $wp_query->query(array(
    'post_type'=>'services',
    'posts_per_page' => -1,
	'orderby'   => 'menu_order',
    'order'     => 'ASC',
    'paged' => $paged,
));
    if ($wp_query->have_posts()) : ?>
    <?php while ($wp_query->have_posts()) : ?>
        
    <?php $wp_query->the_post(); ?>
    
    
    <?php 
		 // get the title
		 $posttitle = get_the_title(); 
		 // sanitize
		 $santigold = sanitize_title_with_dashes($posttitle);
		 
        // Get field Name
        $image = get_field('featured_image'); 
        $url = $image['url'];
        $title = $image['title'];
        $alt = $image['alt'];
        $caption = $image['caption'];
     
        // thumbnail or custom size that will go
        // into the "thumb" variable.
        $size = 'large';
        $thumb = $image['sizes'][ $size ];
        $width = $image['sizes'][ $size . '-width' ];
        $height = $image['sizes'][ $size . '-height' ];
         
		 if(get_field('featured_image') !="") {
			$widthClass = 'sizeright'; 
		 } else {
			 $widthClass = 'sizefull'; 
		 }
        ?>
       
    
    <div class="service">
    	<a name="<?php echo $santigold; ?>"></a>
        <?php $title2 = get_field('service_short_description'); ?>
        <h2 class="redsubtitle"><?php echo $posttitle; ?><?php if ($title2) { ?><span class="short-descr"><?php the_field('service_short_description'); ?></span><?php } ?></h2>
        <div class="service-right <?php //echo $widthClass ?>">
        	<div class="service-description">
            <?php if(get_field('featured_image')!="" ) : ?>
            <div class="service-image">
                <img src="<?php echo $thumb; ?>" alt="<?php echo $alt; ?>" title="<?php echo $title; ?>" />
            </div><!-- service imgage -->
       		 <?php endif; ?>

            <?php 
            $description = get_field("description");
            $description = ($description) ? preg_replace('#<p>(\s|&nbsp;)*+(<br\s*/*>)?(\s|&nbsp;)*</p>#i','',$description) : '';
            ?>
			<?php echo $description; ?>
            </div><!-- service description -->
        </div><!-- service-right -->
        
    </div><!-- service -->
    
    
    <?php endwhile; ?>
    <?php endif; wp_reset_postdata(); ?>
                
                </div><!-- entry content -->
                 </div><!-- left-content pad -->
                
      

		</div><!-- #content -->
	</div><!-- #primary -->

<div class="clear"></div>
<?php get_footer(); ?>